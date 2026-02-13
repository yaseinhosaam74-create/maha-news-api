const axios = require('axios');
const { JSDOM } = require('jsdom');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        const query = encodeURIComponent("مها فتوني");
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ar&gl=EG&ceid=EG:ar`;
        const { data: rssContent } = await axios.get(rssUrl);
        const dom = new JSDOM(rssContent, { contentType: "text/xml" });
        const items = Array.from(dom.window.document.querySelectorAll("item")).slice(0, 5);

        const fullNews = await Promise.all(items.map(async (item) => {
            const link = item.querySelector("link").textContent;
            const rawTitle = item.querySelector("title").textContent;
            const source = rawTitle.split(' - ').pop();
            const title = rawTitle.split(' - ')[0];

            try {
                const { data: html } = await axios.get(link, { timeout: 5000, headers: {'User-Agent': 'Mozilla/5.0'} });
                const artDom = new JSDOM(html);
                const doc = artDom.window.document;

                // استخراج الصورة الأصلية (الغلاف)
                const image = doc.querySelector('meta[property="og:image"]')?.content || 
                              doc.querySelector('meta[name="twitter:image"]')?.content || 
                              'logo.png';

                // استخراج النص الكامل للمقال
                const content = Array.from(doc.querySelectorAll('p'))
                    .map(p => p.textContent.trim())
                    .filter(t => t.length > 50)
                    .slice(0, 10)
                    .join('<br><br>');

                return { title, source, image, content, link };
            } catch (e) {
                return { title, source, image: 'logo.png', content: "انقر لزيارة المصدر وقراءة الخبر كاملاً.", link };
            }
        }));

        res.status(200).json(fullNews);
    } catch (err) {
        res.status(500).json({ error: "فشل الاتصال بمحرك الأخبار" });
    }
};
