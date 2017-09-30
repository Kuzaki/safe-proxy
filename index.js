/**
  Safe-Proxy v1.1b by undefined#3394
  => Module that prevents proxy from sending crafted/modified packets to TERA Server.
  => TERA Client will still send packets that can get you banned if you change your location, use broker-anywhere, etc..
  => Will break most of modules but also prevent you from getting banned for sending malformed packets to server.
*/

const crypto = require('crypto');

const DEBUG = true;
const DEBUG_DELAYED = false;
const DELAY_TIMEOUT = 1000;

module.exports = function SafeProxy(dispatch) {
  let enabled = true;
  
  const silencedStack = {};
  const silencedTimeoutStack = {};
  
  const removeHash = (code, hash) => {
    const stack = silencedStack[code];
    if(!stack) return;
    const idx = stack.indexOf(hash);
    if(idx === -1) return;
    stack.splice(idx, 1);
    if(!stack.length) delete silencedStack[code];
    clearTimeout(silencedTimeoutStack[hash]);
    delete silencedTimeoutStack[hash];
  };
  
  const getPacketName = code => {
    return dispatch.base.protocolMap.code.get(code) || code;
  };
  
  const packetHook = (type, code, data) => {
    if(!enabled) return;
    
    if(type === 'crafted') {
      const stack = silencedStack[code];
      if(stack && stack.length) {
        const hash = crypto.createHash('md5').update(data).digest('hex');
        if(stack.includes(hash)) {
          process.nextTick(() => {
            removeHash(code, hash);
          });
          if(DEBUG_DELAYED) console.log('[SafeProxy] allowed proxy-delayed packet', getPacketName(code));
          return;
        }
      }
    }
    
    if(DEBUG) console.log(`[SafeProxy] blocked proxy-${type} outgoing packet`, getPacketName(code));
    return false;
  };
  
  dispatch.hook('*', 'raw', { filter: { fake: false, incoming: false, modified: true }, order: 10000 }, packetHook.bind(null, 'modified'));
  dispatch.hook('*', 'raw', { filter: { fake: true,  incoming: false }, order: 10000 }, packetHook.bind(null, 'crafted'));
  
  //---
  
  const silencedHook = (code, data) => {
    process.nextTick(() => {
      const hash = crypto.createHash('md5').update(data).digest('hex');
      if(!(code in silencedStack)) silencedStack[code] = [ hash ];
      silencedTimeoutStack[hash] = setTimeout(removeHash, DELAY_TIMEOUT, code, hash);
    });
  };
  
  dispatch.hook('*', 'raw', { filter: { fake: false, incoming: false, silenced: true }, order: 10000 }, silencedHook);
  
  //---
  
  const toggleHook = () => {
    enabled = !enabled;
    dispatch.toClient('S_CHAT', 1, {
      channel: 11,
      authorID: 0,
      unk1: 0,
      gm: 0,
      unk2: 0,
      authorName: '',
      message: '(SafeProxy) Safe-Mode is ' + (enabled ? '<font color="#00EE00">enabled</font>' : '<font color="#DC143C">disabled</font>') + '.',
    });
  };
  
  const chatHook = e => {
    if(/^<FONT>!safe<\/FONT>$/i.test(e.message)) {
      toggleHook();
      return false;
    }
  };

  try {
    require('command')(dispatch).add(['safe', '!safe'], toggleHook);
  }
  catch(e) { }
  
  dispatch.hook('C_CHAT', 1, chatHook);
  dispatch.hook('C_WHISPER', 1, chatHook);
  
};
