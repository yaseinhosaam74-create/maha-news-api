const axios = require('axios');
const { JSDOM } = require('jsdom');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent("مها فتوني")}&hl=ar&gl=EG&ceid=EG:ar`;
        const { data: rssData } = await axios.get(rssUrl);
        const dom = new JSDOM(rssData, { contentType: "text/xml" });
        const items = Array.from(dom.window.document.querySelectorAll("item")).slice(0, 6);

        const results = await Promise.all(items.map(async (item) => {
            const link = item.querySelector("link").textContent;
            const fullTitle = item.querySelector("title").textContent;
            const parts = fullTitle.split(' - ');
            const source = parts.pop();
            const title = parts.join(' - ');

            try {
                const { data: html } = await axios.get(link, { timeout: 5000, headers: {'User-Agent': 'Mozilla/5.0'} });
                const artDom = new JSDOM(html);
                const doc = artDom.window.document;

                // جلب صورة الغلاف (og:image) التي تظهر في المواقع الإخبارية
                const image = doc.querySelector('meta[property="og:image"]')?.content || 
                              doc.querySelector('meta[name="twitter:image"]')?.content || 
                              'logo.png';

                // جلب نص المقال كاملاً
                const content = Array.from(doc.querySelectorAll('p'))
                    .map(p => p.textContent.trim())
                    .filter(t => t.length > 50)
                    .slice(0, 8)
                    .join('<br><br>');

                return { title, source, image, content, link };
            } catch (e) {
                return { title, source, image: 'logo.png', content: "انقر لقراءة الخبر من المصدر", link };
            }
        }));

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: "فشل السيرفر" });
    }
};
