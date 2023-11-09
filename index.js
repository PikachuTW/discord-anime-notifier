const cheerio = require('cheerio');
const Discord = require('discord.js');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const client = new Discord.Client({ intents: 131071, partials: ['CHANNEL', 'USER', 'GUILD_MEMBER', 'MESSAGE', 'REACTION', 'GUILD_SCHEDULED_EVENT'], allowedMentions: { parse: ['users'] } });

dotenv.config();

client.on('ready', () => {
    console.log(`${client.user.tag}, 成員數: ${client.guilds.cache.map(g => g.memberCount).reduce((a, b) => a + b)} ，伺服器數: ${client.guilds.cache.size}`);
    const activity = () => client.user.setActivity(`Made By Tails`, { type: 'PLAYING' });
    activity();
    setInterval(activity, 600000);
});

mongoose
    .connect(process.env.MONGO, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('已經連線到資料庫');
    })
    .catch((err) => console.log(err));

const database = mongoose.model('database', new mongoose.Schema({
    link: {
        type: String,
        required: true,
        unique: true,
    },
}));

const ytvideo = mongoose.model('ytvideo', new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
    },
}));

const main = async () => {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://ani.gamer.com.tw/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
    })
    const html = await response.text();
    const $ = cheerio.load(html);
    const temp = [];
    $('.anime-block > .anime-card-block').each(async (index, element) => {
        const name = $(element).find('.anime-name').children().first().text();
        const image = $(element).find('img[alt="anime_pic"]').attr('data-src');
        const link = $(element).attr('href');

        if (temp.includes(link)) return;
        temp.push(link);

        const canFind = await database.exists({ link });
        if (!canFind || canFind === null) {
            console.log(name, image, link)
            await database.findOneAndUpdate({ link }, { link }, { upsert: true });
            await client.channels.cache.get('948178858610405426').send({
                embeds: [
                    new Discord.EmbedBuilder().setTitle(name).setImage(image).setURL(`https://ani.gamer.com.tw/${link}`).setFooter({ text: '動畫瘋 | Made By Tails' }).setColor('RANDOM')
                ]
            })
        }
    })
    const xml = await (await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=UC45ONEZZfMDZCnEhgYmVu-A', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
    })).text();
    const $xml = cheerio.load(xml, { xmlMode: true });
    $xml('entry').each(async (index, element) => {
        const id = $xml(element).find('yt\\:videoId').text();
        const title = $xml(element).find('title').text();
        const link = $xml(element).find('link').attr('href');
        const image = $xml(element).find('media\\:thumbnail').attr('url');
        const canFind = await ytvideo.exists({ id });
        if (!canFind || canFind === null) {
            console.log(id, title, link, image)
            await ytvideo.findOneAndUpdate({ id }, { id }, { upsert: true });
            await client.channels.cache.get('948178858610405426').send({
                embeds: [
                    new Discord.EmbedBuilder().setTitle(title).setImage(image).setURL(link).setFooter({ text: 'Ani-One | Made By Tails' }).setColor('Random')
                ]
            })
        }
    })
};

client.login(process.env.TOKEN);

setInterval(main, 10000);