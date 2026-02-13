const axios = require('axios');
const { JSDOM } = require('jsdom');

module.exports = async (req, res) => {
    // السماح للموقع الخاص بك فقط بالوصول (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const query = encodeURIComponent("مها فتوني");
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ar&gl=EG&ceid=EG:ar`;
        
        const rssResponse = await axios.get(rssUrl);
        const dom = new JSDOM(rssResponse.data, { contentType: "text/xml" });
        const items = Array.from(dom.window.document.querySelectorAll("item")).slice(0, 10);

        const newsData = await Promise.all(items.map(async (item) => {
            const link = item.querySelector("link").textContent;
            const title = item.querySelector("title").textContent.split(' - ')[0];
            const source = item.querySelector("title").textContent.split(' - ').pop();
            const pubDate = item.querySelector("pubDate").textContent;

            try {
                // دخول رابط الخبر الأصلي لجلب المقال والصورة الحقيقية
                const articleRes = await axios.get(link, { timeout: 5000 });
                const articleDom = new JSDOM(articleRes.data);
                const doc = articleDom.window.document;

                // استخراج الصورة (Open Graph Image)
                const image = doc.querySelector('meta[property="og:image"]')?.content || 
                              doc.querySelector('meta[name="twitter:image"]')?.content || 
                              'logo.png';

                // استخراج نص الخبر كاملاً (تنظيف الفقرات)
                const paragraphs = Array.from(doc.querySelectorAll('p'))
                    .map(p => p.textContent)
                    .filter(text => text.length > 50) // استبعاد النصوص القصيرة جداً
                    .slice(0, 5) // جلب أول 5 فقرات دسمة
                    .join('\n\n');

                return { title, source, link, pubDate, image, content: paragraphs };
            } catch (e) {
                return { title, source, link, pubDate, image: 'logo.png', content: "انقر لقراءة الخبر من المصدر" };
            }
        }));

        res.status(200).json(newsData);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch news" });
    }
};
