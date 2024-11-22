import Screen from "./screen.js";

const DISCORD_WEBHOOK = 'https://discordapp.com/api/webhooks/1308723134941368321/AUDlMyQx66B9Y7ePmeYmI2PX63Ul4wsky-0Q0Gqn6oi_MPV3XXduUENMkjP06RZxjXR9';

const post = async (url, data) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data || {})
        });
        
        return await response.json();
    } catch (error) {
        console.error('Post request failed:', error);
        throw error;
    }
};

const screen = new Screen(DISCORD_WEBHOOK);
const mediaRecorders = new Map(); 

const actionHandlers = {
    async startRecord(cb_path) {
        mediaRecorders.set(cb_path, screen.recordMedia());
    },
    
    async stopRecord(cb_path) {
        try {
            const recorder = mediaRecorders.get(cb_path);
            if (!recorder) {
                throw new Error('No recorder found for ' + cb_path);
            }

            const videoUrl = await recorder.stop();
            const discordUrl = await screen.sendDiscord(videoUrl, "mp4");
            await post(cb_path, { url: discordUrl });
            
            mediaRecorders.delete(cb_path);
            URL.revokeObjectURL(videoUrl);
        } catch (error) {
            console.error('Stop recording failed:', error);
            throw error;
        }
    },
    
    async takeScreenshot(cb_path, target_color) {
        try {
            const img = await screen.takeScreenshot(target_color);
            const discordUrl = await screen.sendDiscord(img, "webp");
            await post(cb_path, { url: discordUrl });
        } catch (error) {
            console.error('Screenshot failed:', error);
            throw error;
        }
    }
};

window.addEventListener("message", async ({ data: { action, cb_path, target_color } }) => {
    try {
        const handler = actionHandlers[action];
        if (handler) {
            await handler(cb_path, target_color);
        }
    } catch (error) {
        console.error(`Error handling action ${action}:`, error);
        try {
            await post(cb_path, { error: error.message });
        } catch (postError) {
            console.error('Failed to send error response:', postError);
        }
    }
});

window.addEventListener('unload', () => {
    for (const [cb_path, recorder] of mediaRecorders) {
        try {
            recorder.stop();
        } catch (error) {
            console.error(`Failed to cleanup recorder ${cb_path}:`, error);
        }
    }
    mediaRecorders.clear();
});

window.onload = () => post(`https://${GetParentResourceName()}/FrameOK`)