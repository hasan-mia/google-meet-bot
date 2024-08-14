const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/join', async (req, res) => {
    const { link } = req.query;
    const email = "emaple@edxample.com"
    const password = "your password"
    if (!link) {
        return res.status(400).send('Meeting link, email, and password are required');
    }

    try {
        // Call the function to join the meeting in the background
        joinMeetingBackground(link, email, password);
        res.status(200).send('Joining the meeting in the background');
    } catch (error) {
        console.error('Error initiating meeting join:', error);
        res.status(500).send('Failed to initiate meeting join');
    }
});

async function joinMeetingBackground(meetLink, email, password) {
    try {
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--use-fake-ui-for-media-stream',
                '--disable-notifications',
                '--mute-audio',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-gpu',
                '--disable-setuid-sandbox',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        // Perform login
        await loginToGoogle(page, email, password);

        // Now proceed to join the meeting
        await joinMeeting(page, meetLink);

        console.log('Joined the meeting in background');

        // Keep the browser open for the duration of the meeting
        setTimeout(async () => {
            await browser.close();
            console.log('Meeting ended and browser closed');
        }, 600000);

    } catch (error) {
        console.error('Error in joinMeetingBackground:', error);
    }
}

async function loginToGoogle(page, email, password) {
    await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2' });
    
    // Enter email
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', email, { delay: 100 });
    await page.click('#identifierNext');
    
    // Wait for password field and enter password
    await page.waitForSelector('input[type="password"]', { visible: true });
    await page.type('input[type="password"]', password, { delay: 100 });
    await page.click('#passwordNext');
    
    // Wait for navigation to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
}

async function joinMeeting(page, meetLink) {
    await page.goto(meetLink, { waitUntil: 'networkidle2' });

     // Check if the microphone is muted and unmute if necessary
    const microphoneButton = await page.$('div[jsname="BOHaEe"]');
    if (microphoneButton) {
        const ariaLabel = await microphoneButton.evaluate(el => el.getAttribute('aria-label'));
        if (ariaLabel && ariaLabel.includes('Turn on microphone')) {
            await microphoneButton.click();
            console.log('Microphone unmuted');
        }
    }

    // Check if the camera is on and turn it off if necessary
    const cameraButton = await page.$('div[jsname="BOHaEe"][data-is-muted="false"]');
    if (cameraButton) {
        const camAriaLabel = await cameraButton.evaluate(el => el.getAttribute('aria-label'));
        if (camAriaLabel && !camAriaLabel.includes('Turn off camera')) {
            await cameraButton.click();
            console.log('Camera turned off');
        }
    }

    
    // Wait for and click the "Join now" button
    await page.waitForSelector('button[jsname="Qx7uuf"]', { visible: true, timeout: 60000 });
    await page.click('button[jsname="Qx7uuf"]');
    
    console.log('Joined the meeting');
    
    // Optional: Take a screenshot to verify
    await page.screenshot({ path: 'meeting-joined.png' });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});