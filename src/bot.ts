import Browser from "./browser";
import Playlist from "./playlist";
import Server from './server';
import fs from 'fs';
import request from 'request';
import Video from "./video";

async function sleep(ms: number) { return new Promise<void>((resolve) => { setTimeout(() => { resolve() }, ms) }); }

function downloadImage(uri, filename, callback)
{
    request.head(uri, function(err, res, body){
      //console.log('content-type:', res.headers['content-type']);
      //console.log('content-length:', res.headers['content-length']);
  
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

interface IPlaylistSerializedData {
    id: string
    name: string
    videos: Video[]
}

interface IBotConfig {
    playlists: string[]
}

export default class Bot {
    public static DATA_DIR = "./data/";
    public static PLAYLISTS_DIR = Bot.DATA_DIR + "/playlists/";
    public static THUMBNAILS_DIR = Bot.DATA_DIR + "/thumbs/";
    public static CONFIG_DIR = "./config.json";
    public static LOG_DIR = "./log.txt";

    public playlists = new Map<string, Playlist>();
    public config: IBotConfig = {
        playlists: []
    }

    public static log(message: string)
    {
        if(!fs.existsSync(Bot.LOG_DIR)) {
            fs.writeFileSync(Bot.LOG_DIR, "");
        }

        let date = new Date()
        const offset = date.getTimezoneOffset()
        date = new Date(date.getTime() - (offset*60*1000))
        const s = date.toISOString().split('T');
        const timeStr = `${s[0]} ${s[1].split(".")[0]}`;
        
        const logMessage = `[${timeStr}] ${message}`;

        fs.appendFileSync(Bot.LOG_DIR, logMessage + "\n");
        console.log(logMessage);
    }

    public async start()
    {
        Bot.log("Bot started...");

        if(!fs.existsSync(Bot.DATA_DIR)) {
            fs.mkdirSync(Bot.DATA_DIR);
        }

        await this.loadConfig();
        await this.loadPlaylists();
        
        await Server.initialize();

        this.setupExpress();

        await Browser.initialize();

        console.log("\n");

        for (const id of this.config.playlists) {
            if(!this.playlists.has(id)) {
                this.createPlaylist(id);
                console.log(`Playlist ${id} created\n`);
            }
    
            const playlist = this.playlists.get(id);
            
            await playlist.processNewVideos();

            for (const videoId of playlist.recentAddedVideoIds) {
                const video = playlist.videos.get(videoId);
                Bot.log(`[${playlist.name}][ ADDED ] Video '${video.title}' by '${video.channelName}', video=${video.id}, playlist=${playlist.id}`);
            }

            for (const videoId of playlist.recentRemovedVideoIds) {
                const video = playlist.videos.get(videoId);
                Bot.log(`[${playlist.name}][ REMOVED ] Video '${video.title}' by '${video.channelName}', video=${video.id}, playlist=${playlist.id}`);
            }

            await this.savePlaylist(playlist);
        }

        console.log("\n")

        const videoIds: string[] = [];

        this.playlists.forEach(playlist => {
            playlist.videos.forEach(video => {
                videoIds.push(video.id);
            })
        });
        await this.downloadThumbs(videoIds);

        //console.log("Done")
        Bot.log("Bot stopped!");
    }

    private setupExpress()
    {
        Server.app.get("/", (req, res) => {
            res.end("ok nice");
        })
    }

    public async downloadThumbs(videoIds: string[])
    {
        if(!fs.existsSync(Bot.THUMBNAILS_DIR)) {
            fs.mkdirSync(Bot.THUMBNAILS_DIR);
        }

        console.log(`Downloading ${videoIds.length} thumbnails...`);

        const downloadedThumbs = await this.getDownloadedThumbs();

        for (const videoId of videoIds) {
            if(downloadedThumbs.includes(videoId)) {
                //console.log(`Thumb '${videoId}' already downloaded`);
                continue;
            }

            console.log(`Downloading thumb '${videoId}'...`);

            await new Promise<void>((resolve) => {
                downloadImage(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, `${Bot.THUMBNAILS_DIR}/${videoId}.png`, function(){
                    
                    resolve();
                });
            })

            //console.log('Downloaded!');
        }

        console.log("Downloaded all thumbs");
    }

    public async getDownloadedThumbs() {
        const files = fs.readdirSync(Bot.THUMBNAILS_DIR);
        for (let i = 0; i < files.length; i++) {
            files[i] = files[i].replace(".png", "");
        }
        return files;
    }

    private async loadConfig()
    {
        if(!fs.existsSync(Bot.CONFIG_DIR)) return;
        this.config = JSON.parse(fs.readFileSync(Bot.CONFIG_DIR, 'utf-8'));
    }

    private async loadPlaylists()
    {
        if(!fs.existsSync(Bot.PLAYLISTS_DIR)) return;

        const files = fs.readdirSync(Bot.PLAYLISTS_DIR);

        for (const file of files)
        {
            const playlistId = file.replace(".json", "");
            const data: IPlaylistSerializedData = JSON.parse(fs.readFileSync(Bot.PLAYLISTS_DIR + `/${playlistId}.json`, 'utf-8'));
        
            const playlist = this.createPlaylist(playlistId);
            playlist.name = data.name;

            for (const video of data.videos) playlist.videos.set(video.id, video);

            console.log(`Loaded playlist '${playlist.name}' (${playlist.id}) with ${Array.from(playlist.videos).length} videos`)
        }
    }

    private createPlaylist(id: string)
    {
        const playlist = new Playlist(id);
        this.playlists.set(id, playlist);
        return playlist;
    }

    public savePlaylist(playlist: Playlist)
    {
        const data: IPlaylistSerializedData = {
            id: playlist.id,
            name: playlist.name,
            videos: Array.from(playlist.videos.values())
        }

        if(!fs.existsSync(Bot.PLAYLISTS_DIR)) {
            fs.mkdirSync(Bot.PLAYLISTS_DIR);
        }

        fs.writeFileSync(Bot.PLAYLISTS_DIR + `/${playlist.id}.json`, JSON.stringify(data));

        //console.log(`Playlist '${playlist.name}' (${playlist.id}) saved!`);
    }
}

/*
document.querySelectorAll("#contents.ytd-playlist-video-list-renderer ytd-playlist-video-renderer")
*/