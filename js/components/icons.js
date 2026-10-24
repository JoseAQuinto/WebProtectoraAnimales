(function(root){
  'use strict';
  // Requirement 31: local, coherent SVG icons. Own static path data on a 24×24 grid, drawn with currentColor
  // strokes; built with createElementNS (never innerHTML) and decorative unless a label is given.
  const NS='http://www.w3.org/2000/svg';
  const paths=Object.freeze({
    dashboard:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    search:'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-4-4',
    animals:'M8 4.5a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6zM16 4.5a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6zM4.5 9.5a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6zM19.5 9.5a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6zM12 12c-3 0-5.5 3.5-5.5 5.5c0 1.6 1.4 2.5 3 2.5c1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.6 0 3-.9 3-2.5c0-2-2.5-5.5-5.5-5.5z',
    adoptions:'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    tasks:'M10 6h10M10 12h10M10 18h10M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2L7.5 11M4 18l1.2 1.2L7.5 17',
    contacts:'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM4 20c1-4 4-6 8-6s7 2 8 6',
    fosters:'M4 11l8-7l8 7M6 9v11h12V9M10 20v-5h4v5',
    volunteers:'M8 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM16 5a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM2.5 20c.8-3 3-5 5.5-5s4.7 2 5.5 5M14.5 15.2c2.6.2 4.4 2 5 4.8',
    finance:'M4 7h16v12H4zM4 7l2-3h12l2 3M15 13h2',
    donations:'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.2C7 7 9.5 7 12 7c2.5 0 5 0 5-1.2C17 3.5 13.5 4 12 7z',
    inventory:'M4 8l8-4l8 4v8l-8 4l-8-4zM4 8l8 4l8-4M12 12v8',
    documents:'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
    reports:'M4 20h16M7 16v-5M12 16V7M17 16v-8',
    exports:'M12 4v11M7 10l5 5l5-5M5 20h14',
    imports:'M12 15V4M7 9l5-5l5 5M5 20h14',
    moduleImport:'M12 4l8 4l-8 4l-8-4zM4 12l8 4l8-4M4 16l8 4l8-4',
    demo:'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M7.5 14h9',
    backup:'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
    retention:'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3s-3.1 3-7 3s-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3',
    settings:'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
    help:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.6 2.3c-.7.3-1.1.9-1.1 1.6V14M12 17.2v.1',
    photo:'M4 6h16v12H4zM7 15l3.5-3.5l3 3l2-2L18 15M15.5 9.5v.1'
  });
  function icon(name,label=null){
    if(!Object.prototype.hasOwnProperty.call(paths,name))throw new RangeError('Unknown icon');
    const svg=document.createElementNS(NS,'svg'),path=document.createElementNS(NS,'path');
    for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round',class:'icon',focusable:'false'}))svg.setAttribute(key,value);
    if(label){svg.setAttribute('role','img');svg.setAttribute('aria-label',label);}else svg.setAttribute('aria-hidden','true');
    path.setAttribute('d',paths[name]);svg.append(path);return svg;
  }
  root.components.icons=Object.freeze({icon,names:Object.freeze(Object.keys(paths))});
}(window.RescueManager));
