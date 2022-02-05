async function loadAllVideos() {
    return new Promise(resolve => {
        let finished = false;

        const loadInterval = setInterval(() => {
            if(finished) {
                clearInterval(loadInterval);
                resolve();
                return;
            }
            
            const hasToLoadMore = document.querySelectorAll("ytd-continuation-item-renderer #spinnerContainer")[0] != undefined;
        
            if(!hasToLoadMore) {
                finished = true;
            }

            window.scrollBy(0, 100000)
        }, 200);
    })
}

function retrieveVideos() {
    const videos = $("#contents.ytd-playlist-video-list-renderer ytd-playlist-video-renderer")
    const jsonData = [];

    for (const video of videos) {
        const id = video.$["thumbnail"].children[0].href.split("?v=")[1].split("&")[0]
    
        console.log(video.$["thumbnail"])

        const videoData = {
            id: id,
            title: $(video).find("#video-title")[0].title,
            channelName: $(video).find(".ytd-channel-name a")[0].textContent,
            channelUrl: $(video).find(".ytd-channel-name a")[0].href,
            count: 1
        }
    
        jsonData.push(videoData);
    }

    return jsonData;
}

async function start() {
    
    console.log("Loading...")
    await loadAllVideos();
    const videos = retrieveVideos();

    console.log(`${videos.length} found`)

    const jsonData = {};
    videos.map(video => {
        if(jsonData[video.id] != undefined) {
            console.log("Video repeated", video)
            jsonData[video.id].count++;
        } else {
            jsonData[video.id] = video
        }
    })
    resolve(jsonData)
}

start();






/*
video.$["thumbnail"].children[0].children[0].children[0].src    
*/