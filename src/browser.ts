import puppeteer from 'puppeteer';
import fs from 'fs';

export default class Browser {
    public static browser: puppeteer.Browser;

    public static async initialize(headless?: boolean)
    {
        headless = headless === true;

        console.log(`Init browser (headless=${headless})`);

        const puppeteer_options = {
            /*
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // <- this one doesn't works in Windows
                '--disable-gpu',
                
            ],
            */
            headless: headless,
            userDataDir: "./userData"
        }

        this.browser = await puppeteer.launch(puppeteer_options);
    }

    public static async injectJQuery(page: puppeteer.Page)
    {
        this.injectScript(page, "https://code.jquery.com/jquery-3.2.1.min.js");
    }

    public static async injectScript(page: puppeteer.Page, url: string)
    {
        await page.addScriptTag({url: url})
    }

    public static async getPage(n: number)
    {
        const browser = Browser.browser;
        return (await browser.pages())[n];
    }
}