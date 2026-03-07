import https from 'https';

const options = {
  hostname: 'api.github.com',
  path: '/repos/readyplayerme/animation-library/contents/animations',
  headers: {
    'User-Agent': 'Node-Fetch'
  }
};

https.get(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const list = JSON.parse(data);
    if (!Array.isArray(list)) {
      console.log('Error:', list);
      return;
    }
    const waves = list.filter(f => f.name.toLowerCase().includes('wave')).map(f => f.name).slice(0, 5);
    const idles = list.filter(f => f.name.toLowerCase().includes('idle')).map(f => f.name).slice(0, 5);
    console.log('Waves:', waves);
    console.log('Idles:', idles);
  });
}).on('error', e => console.error(e));
