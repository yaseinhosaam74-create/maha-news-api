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
        const items = Array.from(dom.window.document.querySelectorAll("item")).slice(0, 10);

        const results = await Promise.all(items.map(async (item) => {
            const link = item.querySelector("link").textContent;
            const pubDate = new Date(item.querySelector("pubDate").textContent).toLocaleDateString('ar-EG');
            const rawTitle = item.querySelector("title").textContent;
            
            // فصل العنوان عن اسم الموقع بدقة
            const titleParts = rawTitle.split(' - ');
            const sourceName = titleParts.pop(); 
            const cleanTitle = titleParts.join(' - ');

            try {
                const { data: html } = await axios.get(link, { timeout: 5000, headers: {'User-Agent': 'Mozilla/5.0'} });
                const articleDom = new JSDOM(html);
                const doc = articleDom.window.document;

                // سحب صورة الغلاف الأصلية HD
                const image = doc.querySelector('meta[property="og:image"]')?.content || 
                              doc.querySelector('meta[name="twitter:image"]')?.content || 
                              'logo.png';

                // سحب الخبر كاملاً عبر تجميع الفقرات
                const paragraphs = Array.from(doc.querySelectorAll('p'))
                    .map(p => p.textContent.trim())
                    .filter(t => t.length > 40)
                    .slice(0, 12)
                    .join('<br><br>');

                return { title: cleanTitle, source: sourceName, image, content: paragraphs, date: pubDate, link };
            } catch (e) {
                return { title: cleanTitle, source: sourceName, image: 'logo.png', content: "انقر لقراءة الخبر من المصدر الأصلي", date: pubDate, link };
            }
        }));

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
