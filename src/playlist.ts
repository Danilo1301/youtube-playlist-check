import Browser from "./browser";
import Video from "./video";

interface IRetrieveVideoData {
    id: string
    title: string
    channelName: string
    channelUrl: string
    count: number
}

export default class Playlist {
    public id: string;
    public name: string;
    public videos = new Map<string, Video>();

    public recentRemovedVideoIds: string[] = [];
    public recentAddedVideoIds: string[] = [];

    constructor(id: string) {
        this.id = id;
        this.name = `Playlist ${id}`;
    }

    public async processNewVideos() {

        console.log(`Processing playlist '${this.name}'...`);

        const vids = await this.retrieveVideos();

        await this.getPlaylistName();

        let i_new = 0;
        let i = 0;
        for (const id in vids) {
            i++;

            if(this.hasVideo(id)) continue;

            this.addNewVideo(vids[id]);
            i_new++;
        }

        
        
        //
        const videos = Array.from(this.videos.values()).filter(video => !video.removed);
        
        let i_removed = 0;
        for (const video of videos) {
            if(vids[video.id] == undefined) {
                //console.log(`Video '${video.title}' (${video.id}) removed`);
                i_removed++;
                
                video.removed = true;
                video.removedAt = Date.now();

                this.recentRemovedVideoIds.push(video.id);
            }
        }
        
        console.log(`${i} videos processed (${i_new} new) (${i_removed} removed)\n`);
    }

    private async getPlaylistName() {
        const browser = Browser.browser;
        const page = (await browser.pages())[0];
        const name = await page.evaluate(() => {
            return document.querySelector("h1#title.ytd-playlist-sidebar-primary-info-renderer").textContent
        });

        this.name = name;

        /*
        $("h1#title.ytd-playlist-sidebar-primary-info-renderer")[0].textContent
        */
    }

    private addNewVideo(vid: IRetrieveVideoData) {
        const video: Video = {
            id: vid.id,
            title: vid.title,
            channelName: vid.channelName,
            channelUrl: vid.channelUrl,
            addedAt: Date.now(),
            removed: false,
            removedAt: -1,
            count: vid.count
        }

        this.videos.set(video.id, video);

        this.recentAddedVideoIds.push(video.id);

        //console.log(`${video.id} added`)

        return video;
    }

    public hasVideo(id: string) {
        return this.videos.has(id);
    }

    
    public static async retrieveVideos(id: string) {
        const browser = Browser.browser;
        const page = (await browser.pages())[0];
        const playlistUrl = "https://www.youtube.com/playlist?list=" + id;

        await page.goto(playlistUrl);
        await Browser.injectJQuery(page);

        const videos: {[key: string]: IRetrieveVideoData} = {};

        const data = await page.evaluate(() => {
            var el = document.createElement("script");
            el.src = 'http://localhost:3000/get-videos.js';
            document.body.append(el);

            return new Promise<any>((resolve) => {
                window["resolve"] = (d) => resolve(d);
            })
        });

        for (const k in data) videos[k] = data[k];

        return videos;
    }
    

    public async retrieveVideos() {

        return Playlist.retrieveVideos(this.id);

        /*
        const browser = Browser.browser;
        const page = (await browser.pages())[0];
        const playlistUrl = "https://www.youtube.com/playlist?list=" + this.id;

        await page.goto(playlistUrl);
        await Browser.injectJQuery(page);

        const videos: {[key: string]: IRetrieveVideoData} = {};

        const data = await page.evaluate(() => {
            var el = document.createElement("script");
            el.src = 'http://localhost:3000/get-videos.js';
            document.body.append(el);

            return new Promise<any>((resolve) => {
                window["resolve"] = (d) => resolve(d);
            })
        });

        for (const k in data) videos[k] = data[k];

        return videos;
        */
    }
}