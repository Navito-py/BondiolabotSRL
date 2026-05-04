const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus
} = require("@discordjs/voice");
const { spawn } = require("child_process");
const path = require("path");

const queues = new Map();
const IDLE_DISCONNECT_MS = 5 * 60 * 1000;

async function getOrCreateQueue(guildId, channel) {
    let queue = queues.get(guildId);

    if (queue) {
        clearIdleDisconnect(queue);
        return queue;
    }

    let connection = getVoiceConnection(guildId);

    if (!connection) {
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    }

    const player = createAudioPlayer();

    queue = {
        connection,
        player,
        songs: [],
        currentProcess: null,
        controlAction: null,
        idleTimeout: null
    };

    player.on(AudioPlayerStatus.Idle, () => {
        handlePlaybackEnd(guildId);
    });

    player.on("error", error => {
        console.error("Audio player error:", error);
        handlePlaybackEnd(guildId);
    });

    queues.set(guildId, queue);

    return queue;
}

async function enqueue(guildId, channel, input, requestedBy) {
    const queue = await getOrCreateQueue(guildId, channel);
    const shouldStart = queue.songs.length === 0 && queue.player.state.status === AudioPlayerStatus.Idle;
    const song = createSong(input, requestedBy);

    clearIdleDisconnect(queue);
    queue.songs.push(song);

    if (shouldStart) {
        playNext(guildId);
    }

    return {
        position: queue.songs.length,
        song,
        started: shouldStart
    };
}

function createSong(input, requestedBy) {
    const trimmedInput = input.trim();
    const isUrl = /^https?:\/\//i.test(trimmedInput);

    return {
        title: trimmedInput,
        requestedBy,
        playTarget: isUrl ? trimmedInput : `ytsearch1:${trimmedInput}`,
        isSearch: !isUrl
    };
}

function handlePlaybackEnd(guildId) {
    const queue = queues.get(guildId);

    if (!queue) return;

    if (queue.controlAction === "clear") {
        queue.controlAction = null;
        playNext(guildId, { keepConnectedOnEmpty: true });
        return;
    }

    if (queue.controlAction === "destroy") {
        return;
    }

    if (queue.controlAction === "skip") {
        queue.controlAction = null;
        playNext(guildId);
        return;
    }

    if (queue.songs.length > 0) {
        queue.songs.shift();
    }

    playNext(guildId);
}

function playNext(guildId, options = {}) {
    const { keepConnectedOnEmpty = false } = options;
    const queue = queues.get(guildId);

    if (!queue) return;

    const song = queue.songs[0];

    if (!song) {
        queue.currentProcess = null;

        if (!keepConnectedOnEmpty) {
            scheduleIdleDisconnect(guildId, queue);
        }

        return;
    }

    clearIdleDisconnect(queue);

    const ytdlpPath = process.platform === "win32"
        ? path.join(process.cwd(), "yt-dlp.exe")
        : "yt-dlp";

        const yt = spawn(ytdlpPath, [
            "--js-runtimes",
            "deno:/root/.deno/bin/deno",
            "--remote-components",
            "ejs:github",
            "--cookies",
            "/root/BondiolabotSRL/cookies.txt",
            "-f",
            "bestaudio",
            "-o",
            "-",
            "--no-playlist",
            song.playTarget
        ]);
    queue.currentProcess = yt;

    yt.stderr.on("data", data => {
        console.error(`yt-dlp error: ${data}`);
    });

    yt.once("close", () => {
        if (queue.currentProcess === yt) {
            queue.currentProcess = null;
        }
    });

    const resource = createAudioResource(yt.stdout);

    queue.player.play(resource);
    queue.connection.subscribe(queue.player);
}

function clearQueue(guildId) {
    const queue = queues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        return { ok: false, reason: "empty" };
    }

    queue.songs = [];
    queue.controlAction = "clear";
    clearIdleDisconnect(queue);

    if (queue.player.state.status === AudioPlayerStatus.Idle) {
        queue.controlAction = null;
        return { ok: true };
    }

    stopCurrentPlayback(queue);
    return { ok: true };
}

function skipQueue(guildId) {
    const queue = queues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        return { ok: false, reason: "empty" };
    }

    if (queue.songs.length < 2) {
        return { ok: false, reason: "no_next" };
    }

    const skipped = queue.songs[0];
    const next = queue.songs[1];

    queue.songs.shift();
    queue.controlAction = "skip";
    stopCurrentPlayback(queue);

    return { ok: true, skipped, next };
}

function pauseQueue(guildId) {
    const queue = queues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        return { ok: false, reason: "empty" };
    }

    if (queue.player.state.status === AudioPlayerStatus.Paused) {
        return { ok: false, reason: "already_paused" };
    }

    const paused = queue.player.pause();

    if (!paused) {
        return { ok: false, reason: "not_playing" };
    }

    return { ok: true, song: queue.songs[0] };
}

function resumeQueue(guildId) {
    const queue = queues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        return { ok: false, reason: "empty" };
    }

    if (queue.player.state.status !== AudioPlayerStatus.Paused) {
        return { ok: false, reason: "not_paused" };
    }

    queue.player.unpause();
    return { ok: true, song: queue.songs[0] };
}

function getQueueSnapshot(guildId) {
    const queue = queues.get(guildId);

    if (!queue || queue.songs.length === 0) {
        return { ok: false, reason: "empty" };
    }

    return {
        ok: true,
        status: queue.player.state.status,
        current: queue.songs[0],
        upcoming: queue.songs.slice(1)
    };
}

function destroyQueue(guildId) {
    const queue = queues.get(guildId);

    if (!queue) {
        return false;
    }

    queue.songs = [];
    queue.controlAction = "destroy";
    clearIdleDisconnect(queue);
    stopCurrentPlayback(queue);
    queue.connection.destroy();
    queues.delete(guildId);

    return true;
}

function stopCurrentPlayback(queue) {
    const currentProcess = queue.currentProcess;

    queue.currentProcess = null;
    queue.player.stop(true);

    if (currentProcess) {
        currentProcess.kill();
    }
}

function scheduleIdleDisconnect(guildId, queue) {
    clearIdleDisconnect(queue);

    queue.idleTimeout = setTimeout(() => {
        const currentQueue = queues.get(guildId);

        if (!currentQueue || currentQueue.songs.length > 0) {
            return;
        }

        currentQueue.connection.destroy();
        queues.delete(guildId);
    }, IDLE_DISCONNECT_MS);
}

function clearIdleDisconnect(queue) {
    if (!queue.idleTimeout) {
        return;
    }

    clearTimeout(queue.idleTimeout);
    queue.idleTimeout = null;
}

module.exports = {
    enqueue,
    clearQueue,
    skipQueue,
    pauseQueue,
    resumeQueue,
    getQueueSnapshot,
    destroyQueue
};
