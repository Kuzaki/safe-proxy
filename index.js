/**
  Safe-Proxy v1.0 by undefined#3394
  => Module that prevents proxy from sending crafted/modified packets to TERA Server.
  => TERA Client will still send packets that can get you banned if you change your location, use broker-anywhere, etc..
  => Will break most of modules but also prevent you from getting banned for sending malformed packets to server.
*/

module.exports = function SafeProxy(dispatch) {
  const debug = true;
  let enabled = true;
  
  const packetHook = (type, code) => {
    if(!enabled) return;
    if(debug) {
      const name = dispatch.base.protocolMap.code.get(code);
      console.log(`[SafeProxy] blocking proxy-${type} outgoing packet`, (name || code));
    }
    return false;
  };
  
  dispatch.hook('*', 'raw', { filter: { fake: false, incoming: false, modified: true }, order: 10000 }, packetHook.bind(null, 'modified'));
  dispatch.hook('*', 'raw', { filter: { fake: true,  incoming: false }, order: 10000 }, packetHook.bind(null, 'crafted'));
  
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
