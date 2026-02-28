import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────
// CONSTANTS & PURE HELPERS
// ─────────────────────────────────────────────
const WIND_KANJI = ["東", "南", "西", "北"];
const WIND_NAMES = ["East", "South", "West", "North"];
const MAN_KANJI  = ["一","二","三","四","五","六","七","八","九"];
const HONOR_CHARS = ["東","南","西","北","白","發","中"];
const HONOR_DATA  = [
  { char:"東", color:"#1a3a8c", label:"EAST",  bg:"#ddeeff" },
  { char:"南", color:"#8b1a1a", label:"SOUTH", bg:"#ffdde0" },
  { char:"西", color:"#1a3a8c", label:"WEST",  bg:"#ddeeff" },
  { char:"北", color:"#1a3a8c", label:"NORTH", bg:"#ddeeff" },
  { char:"白", color:"#3a3a3a", label:"",      bg:null },
  { char:"發", color:"#1a7a30", label:"",      bg:null },
  { char:"中", color:"#c0281a", label:"",      bg:null },
];

const tileKey    = (t) => t.suit + t.num;
const tilesMatch = (a, b) => a.suit === b.suit && a.num === b.num;

function tileChar(t) {
  if (t.suit === "m") return MAN_KANJI[t.num - 1];
  if (t.suit === "p") return ["①","②","③","④","⑤","⑥","⑦","⑧","⑨"][t.num - 1];
  if (t.suit === "s") return ["🎋","2","3","4","5","6","7","8","9"][t.num - 1];
  if (t.suit === "z") return HONOR_CHARS[t.num - 1];
  return "?";
}

function buildWall() {
  const tiles = [];
  let id = 0;
  ["m","p","s"].forEach(suit => {
    for (let num = 1; num <= 9; num++)
      for (let i = 0; i < 4; i++) tiles.push({ suit, num, id: id++ });
  });
  for (let num = 1; num <= 7; num++)
    for (let i = 0; i < 4; i++) tiles.push({ suit:"z", num, id: id++ });
  return shuffle(tiles);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortHand(hand) {
  const so = { m:0, p:1, s:2, z:3 };
  return [...hand].sort((a, b) =>
    so[a.suit] !== so[b.suit] ? so[a.suit] - so[b.suit] : a.num - b.num
  );
}

function removeOnce(arr, target) {
  const i = arr.findIndex(t => tilesMatch(t, target));
  if (i === -1) return arr;
  return [...arr.slice(0, i), ...arr.slice(i + 1)];
}

function removeN(arr, target, n) {
  let r = [...arr];
  for (let i = 0; i < n; i++) r = removeOnce(r, target);
  return r;
}

function checkMelds(tiles) {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;
  const sorted = sortHand(tiles);
  const first = sorted[0];
  if (sorted.filter(t => tilesMatch(t, first)).length >= 3) {
    if (checkMelds(removeN(sorted, first, 3))) return true;
  }
  if (first.suit !== "z") {
    const n2 = sorted.find(t => t.suit === first.suit && t.num === first.num + 1);
    const n3 = sorted.find(t => t.suit === first.suit && t.num === first.num + 2);
    if (n2 && n3) {
      const r = removeOnce(removeOnce(removeOnce(sorted, first), n2), n3);
      if (checkMelds(r)) return true;
    }
  }
  return false;
}

function checkWinHand(tiles) {
  if (tiles.length === 2) return tilesMatch(tiles[0], tiles[1]);
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 2) return false;
  const sorted = sortHand(tiles);
  for (let i = 1; i < sorted.length; i++) {
    if (tilesMatch(sorted[0], sorted[i])) {
      const rest = [...sorted.slice(0, i), ...sorted.slice(i + 1)];
      if (checkMelds(rest)) return true;
    }
  }
  return false;
}

function checkAllPungHand(tiles) {
  if (tiles.length === 2) return tilesMatch(tiles[0], tiles[1]);
  if (tiles.length === 0) return true;
  const sorted = sortHand(tiles);
  const first = sorted[0];
  if (sorted.filter(t => tilesMatch(t, first)).length >= 3)
    return checkAllPungHand(removeN(sorted, first, 3));
  return false;
}

function isAllPung(hand, melds) {
  if (melds.some(m => m.type === "chi")) return false;
  return checkAllPungHand(sortHand(hand));
}

function scoreHand(hands, melds, seatWinds, roundWind, player, tile, isSelfDraw) {
  let fan = 0;
  const hand = [...hands[player], tile];
  const playerMelds = melds[player];
  const allTiles = [...hand, ...playerMelds.flatMap(m => m.tiles)];

  if (isSelfDraw) fan++;
  if (isAllPung(hand, playerMelds)) fan += 3;

  const nonHonor = allTiles.filter(t => t.suit !== "z");
  const suits = new Set(nonHonor.map(t => t.suit));
  if (suits.size === 1 && nonHonor.length === allTiles.length) fan += 6;
  else if (suits.size === 1) fan += 3;

  playerMelds.forEach(m => {
    if (m.type === "pung" && m.tiles[0].suit === "z" && m.tiles[0].num >= 5) fan++;
  });
  [5,6,7].forEach(n => {
    if (hand.filter(t => t.suit === "z" && t.num === n).length >= 3) fan++;
  });
  const sw = seatWinds[player];
  if (playerMelds.some(m => m.type === "pung" && m.tiles[0].suit === "z" && m.tiles[0].num === sw)) fan++;
  if (playerMelds.some(m => m.type === "pung" && m.tiles[0].suit === "z" && m.tiles[0].num === roundWind)) fan++;

  fan = Math.max(1, fan);
  return { fan, base: Math.pow(2, fan) * 2 };
}

function canChi(hand, tile) {
  if (tile.suit === "z") return [];
  const find = (num) => hand.find(t => t.suit === tile.suit && t.num === num);
  const n = tile.num, opts = [];
  if (find(n+1) && find(n+2)) opts.push([find(n+1), find(n+2)]);
  if (find(n-1) && find(n+1)) opts.push([find(n-1), find(n+1)]);
  if (find(n-2) && find(n-1)) opts.push([find(n-2), find(n-1)]);
  return opts;
}

function canPung(hand, tile) {
  return hand.filter(t => tilesMatch(t, tile)).length >= 2;
}

function canKong(hand, tile) {
  return hand.filter(t => tilesMatch(t, tile)).length >= 3;
}

function handPotential(hand) {
  let score = 0;
  const sorted = sortHand(hand);
  sorted.forEach((t, i) => {
    if (sorted.some((u, j) => j !== i && tilesMatch(u, t))) score += 3;
    if (t.suit !== "z") {
      if (sorted.some(u => u.suit === t.suit && (u.num === t.num+1 || u.num === t.num-1))) score += 2;
      if (sorted.some(u => u.suit === t.suit && (u.num === t.num+2 || u.num === t.num-2))) score += 1;
    }
  });
  return score;
}

function aiChooseDiscard(hand) {
  const sorted = sortHand(hand);
  let best = sorted[sorted.length - 1], bestScore = -1;
  sorted.forEach(tile => {
    const rest = sorted.filter(t => t !== tile);
    const score = handPotential(rest);
    if (score > bestScore) { bestScore = score; best = tile; }
  });
  return best;
}

const PLAYER_NAMES = ["You", "West", "North", "East"];

// ─────────────────────────────────────────────
// SVG TILE ARTWORK
// ─────────────────────────────────────────────
function PinSVG({ n, w, h }) {
  const layouts = {
    1:[[26,36]], 2:[[26,20],[26,52]], 3:[[26,16],[26,36],[26,56]],
    4:[[16,20],[36,20],[16,52],[36,52]], 5:[[16,18],[36,18],[26,36],[16,54],[36,54]],
    6:[[16,18],[36,18],[16,36],[36,36],[16,54],[36,54]],
    7:[[16,14],[36,14],[16,32],[36,32],[26,50],[16,64],[36,64]],
    8:[[14,14],[28,14],[42,14],[14,36],[42,36],[14,58],[28,58],[42,58]],
    9:[[14,12],[28,12],[42,12],[14,32],[28,32],[42,32],[14,52],[28,52],[42,52]],
  };
  const radii = {1:14,2:11,3:9,4:9,5:8,6:8,7:7,8:7,9:7};
  const r = radii[n];
  return (
    <svg viewBox="0 0 52 72" width={w} height={h}>
      {layouts[n].map(([cx,cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill="#1a3a8c"/>
          <circle cx={cx} cy={cy} r={r*0.82} fill="#d63a2a"/>
          <circle cx={cx} cy={cy} r={r*0.64} fill="#1a3a8c"/>
          <circle cx={cx} cy={cy} r={r*0.42} fill="#e8e0c8"/>
          <circle cx={cx-r*0.15} cy={cy-r*0.15} r={r*0.18} fill="rgba(255,255,255,0.7)"/>
        </g>
      ))}
    </svg>
  );
}

function SouSVG({ n, w, h }) {
  if (n === 1) return (
    <svg viewBox="0 0 52 72" width={w} height={h}>
      <rect x="20" y="12" width="12" height="48" rx="5" fill="#1a6b2a"/>
      <rect x="20" y="12" width="12" height="48" rx="5" fill="none" stroke="#0d4a1a" strokeWidth="1"/>
      <rect x="18" y="24" width="16" height="5" rx="2" fill="#2a8b3a"/>
      <rect x="18" y="38" width="16" height="5" rx="2" fill="#2a8b3a"/>
      <circle cx="26" cy="8" r="5" fill="#c9a84c"/>
      <circle cx="28" cy="7" r="1.5" fill="#1a0a00"/>
      <polygon points="30,7 34,8 30,9" fill="#d63031"/>
    </svg>
  );
  const colCount = n <= 3 ? 1 : n <= 6 ? 2 : 3;
  const rowCount = Math.ceil(n / colCount);
  const sw=9, sh = n<=3?18:n<=6?18:14;
  const px=(52-colCount*sw-(colCount-1)*4)/2, py=(72-rowCount*sh-(rowCount-1)*4)/2;
  const colors=["#1a7a30","#228b40","#1a6b2a"];
  const sticks = [];
  for (let i=0; i<n; i++) {
    const col=i%colCount, row=Math.floor(i/colCount);
    const x=px+col*(sw+4), y=py+row*(sh+4), c=colors[i%3], midY=y+sh/2-2;
    sticks.push(
      <g key={i}>
        <rect x={x} y={y} width={sw} height={sh} rx="3" fill={c}/>
        <rect x={x+2} y={y+2} width="3" height={sh-4} rx="1" fill="rgba(255,255,255,0.25)"/>
        <rect x={x-1} y={midY} width={sw+2} height="4" rx="1" fill="#0d4a1a"/>
        <rect x={x} y={midY+1} width={sw} height="2" rx="1" fill="#3aaa50"/>
      </g>
    );
  }
  return <svg viewBox="0 0 52 72" width={w} height={h}>{sticks}</svg>;
}

function ManSVG({ n, w, h }) {
  const kanji = MAN_KANJI[n-1];
  return (
    <svg viewBox="0 0 52 72" width={w} height={h}>
      <rect x="10" y="19" width="32" height="2.5" rx="1" fill="#8b1a1a" opacity="0.6"/>
      <text x="26" y="16" fontFamily="serif" fontSize="11" fontWeight="700" fill="#8b1a1a" textAnchor="middle">{kanji}</text>
      <text x="26" y="56" fontFamily="serif" fontSize="38" fontWeight="900" fill="#c0281a" textAnchor="middle">{kanji}</text>
    </svg>
  );
}

function HonorSVG({ n, w, h }) {
  const d = HONOR_DATA[n-1];
  return (
    <svg viewBox="0 0 52 72" width={w} height={h}>
      {n === 5 && <>
        <rect x="10" y="14" width="32" height="44" rx="3" fill="none" stroke="#1a6b2a" strokeWidth="3"/>
        <text x="26" y="44" fontFamily="serif" fontSize="28" fontWeight="900" fill="#3a3a3a" textAnchor="middle">{d.char}</text>
      </>}
      {n === 6 && <text x="26" y="52" fontFamily="serif" fontSize="42" fontWeight="900" fill="#1a7a30" textAnchor="middle">{d.char}</text>}
      {n === 7 && <>
        <circle cx="26" cy="36" r="20" fill="#c0281a" opacity="0.15"/>
        <text x="26" y="52" fontFamily="serif" fontSize="42" fontWeight="900" fill="#c0281a" textAnchor="middle">{d.char}</text>
      </>}
      {n <= 4 && <>
        <rect x="8" y="10" width="36" height="52" rx="4" fill={d.bg} opacity="0.4"/>
        <text x="26" y="52" fontFamily="serif" fontSize="40" fontWeight="900" fill={d.color} textAnchor="middle">{d.char}</text>
        <text x="26" y="66" fontFamily="serif" fontSize="7" fill={d.color} opacity="0.7" textAnchor="middle">{d.label}</text>
      </>}
    </svg>
  );
}

function TileArt({ tile, w, h }) {
  if (tile.suit === "p") return <PinSVG n={tile.num} w={w} h={h}/>;
  if (tile.suit === "s") return <SouSVG n={tile.num} w={w} h={h}/>;
  if (tile.suit === "m") return <ManSVG n={tile.num} w={w} h={h}/>;
  return <HonorSVG n={tile.num} w={w} h={h}/>;
}

// ─────────────────────────────────────────────
// TILE COMPONENT
// ─────────────────────────────────────────────
function Tile({ tile, size="normal", selected=false, isNew=false, onClick }) {
  const w = size==="normal"?52:size==="small"?38:30;
  const h = size==="normal"?72:size==="small"?54:42;
  return (
    <div
      onClick={onClick}
      style={{
        position:"relative", display:"inline-block",
        cursor:onClick?"pointer":"default", flexShrink:0,
        marginLeft:isNew?10:0,
      }}
    >
      <div style={{
        width:w, height:h,
        background:"linear-gradient(160deg,#fdfaf0 0%,#f5edd6 60%,#ede0c0 100%)",
        border:selected?"1.5px solid #c9a84c":"1.5px solid #c8b88a",
        borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:selected
          ?"3px 4px 0 #7a5c28,0 0 0 2px #c9a84c,0 0 14px rgba(201,168,76,0.5),inset 0 0 0 1px rgba(255,255,255,0.8)"
          :"3px 4px 0 #7a5c28,3px 4px 8px rgba(0,0,0,0.45),inset 0 0 0 1px rgba(255,255,255,0.8)",
        overflow:"hidden",
        transform:selected?"translateY(-8px)":"none",
        transition:"all 0.12s",
      }}>
        <TileArt tile={tile} w={w} h={h}/>
      </div>
    </div>
  );
}

function BackTile({ w=20, h=30 }) {
  return (
    <div style={{
      width:w, height:h, flexShrink:0,
      background:"linear-gradient(135deg,#1a6b4a 0%,#0d4a2f 100%)",
      border:"1px solid rgba(201,168,76,0.4)", borderRadius:3,
      boxShadow:"1px 1px 3px rgba(0,0,0,0.6)",
    }}/>
  );
}

function DiscardTile({ tile, isLatest=false }) {
  return (
    <div style={{
      width:30, height:42, flexShrink:0, overflow:"hidden",
      background:"#f8f0dc", border:"1px solid #c8b88a", borderRadius:3,
      boxShadow:isLatest
        ?"0 0 8px rgba(201,168,76,0.6),0 0 0 1.5px #c9a84c"
        :"1px 2px 0 #8b6e3a,1px 2px 4px rgba(0,0,0,0.3)",
      display:"inline-block",
    }}>
      <TileArt tile={tile} w={30} h={42}/>
    </div>
  );
}

// ─────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────
function createInitialState() {
  const wall = buildWall();
  const hands = [[],[],[],[]];
  for (let i=0; i<13; i++) for (let p=0; p<4; p++) hands[p].push(wall.pop());
  const drawTile = wall.pop();
  return {
    wall, hands:hands.map(h=>sortHand(h)),
    melds:[[],[],[],[]], discards:[[],[],[],[]],
    allDiscards:[], scores:[1000,1000,1000,1000],
    currentPlayer:0, seatWinds:[1,2,3,0],
    roundWind:0, roundNum:1,
    drawTile, phase:"discard",
    selectedTile:-1, pendingDiscard:null,
    pendingClaims:[], canDeclareWin:false,
    turnCount:0, logs:[{msg:"Game started.",important:true}],
    overlay:null, claimPrompt:null,
  };
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function MahjongHK() {
  const [G, setG] = useState(createInitialState);
  const [minFan, setMinFan] = useState(0);
  const aiTimerRef = useRef(null);
  const MF_DESCS = ["Any winning hand","Must score ≥ 1 fan","Must score ≥ 2 fan","Must score ≥ 3 fan"];

  const checkWinWithDiscard = useCallback((state, player, tile) => {
    const hand14 = [...state.hands[player], tile];
    const total = state.melds[player].reduce((a,m)=>a+m.tiles.length,0);
    const ok = checkWinHand(hand14) || (hand14.length+total===14 && checkWinHand(hand14));
    if (!ok) return false;
    if (player===0 && minFan>0) {
      const {fan} = scoreHand(state.hands,state.melds,state.seatWinds,state.roundWind,player,tile,false);
      return fan>=minFan;
    }
    return true;
  }, [minFan]);

  const checkSelfDraw = useCallback((state) => {
    if (!state.drawTile) return false;
    const hand14 = [...state.hands[0], state.drawTile];
    const total = state.melds[0].reduce((a,m)=>a+m.tiles.length,0);
    const ok = checkWinHand(hand14)||(hand14.length+total===14&&checkWinHand(hand14));
    if (!ok) return false;
    if (minFan>0) {
      const {fan}=scoreHand(state.hands,state.melds,state.seatWinds,state.roundWind,0,state.drawTile,true);
      return fan>=minFan;
    }
    return true;
  }, [minFan]);

  function buildClaims(state, tile, discardPlayer) {
    const claims=[];
    for (let p=0;p<4;p++) {
      if (p===discardPlayer) continue;
      const hand=state.hands[p];
      const canW=checkWinWithDiscard(state,p,tile);
      const canP=canPung(hand,tile);
      const canK=canKong(hand,tile);
      const canC=p===(discardPlayer+1)%4?canChi(hand,tile):[];
      if (canW||canP||canK||canC.length>0)
        claims.push({player:p,canWin:canW,canPung:canP,canKong:canK,canChi:canC});
    }
    return claims;
  }

  function bestAiClaim(claims) {
    const wins=claims.filter(c=>c.canWin); if(wins.length) return {type:"win",...wins[0]};
    const kongs=claims.filter(c=>c.canKong); if(kongs.length) return {type:"kong",...kongs[0]};
    const pungs=claims.filter(c=>c.canPung&&Math.random()>0.3); if(pungs.length) return {type:"pung",...pungs[0]};
    const chis=claims.filter(c=>c.canChi.length>0&&Math.random()>0.5);
    if(chis.length) return {type:"chi",...chis[0],chiPair:chis[0].canChi[0]};
    return null;
  }

  function applyAiClaim(state, claim, tile) {
    const p=claim.player;
    if (claim.type==="win") {
      const {fan,base}=scoreHand(state.hands,state.melds,state.seatWinds,state.roundWind,p,tile,false);
      const sc=[...state.scores]; sc[state.pendingDiscard.player]-=base; sc[p]+=base;
      return {...state,scores:sc,phase:"end",
        logs:[...state.logs,{msg:`${PLAYER_NAMES[p]} WINS! ${fan} fan = ${base} pts`,important:true}],
        overlay:{title:`🀄 ${PLAYER_NAMES[p].toUpperCase()} WINS!`,
          sub:`${fan} Fan · ${base} Points\n\nYou:${sc[0]} | West:${sc[1]} | North:${sc[2]} | East:${sc[3]}`}};
    }
    if (claim.type==="pung") {
      let rm=0;
      const nh=state.hands[p].filter(t=>{if(rm<2&&tilesMatch(t,tile)){rm++;return false;}return true;});
      const nm=state.melds.map((m,i)=>i===p?[...m,{type:"pung",tiles:[tile,tile,tile],open:true}]:m);
      return {...state,hands:state.hands.map((h,i)=>i===p?nh:h),melds:nm,currentPlayer:p,phase:"discard",
        logs:[...state.logs,{msg:`${PLAYER_NAMES[p]} PUNGs ${tileChar(tile)}`,important:true}]};
    }
    if (claim.type==="chi") {
      let nh=[...state.hands[p]];
      claim.chiPair.forEach(pt=>{const idx=nh.findIndex(t=>tilesMatch(t,pt));if(idx!==-1)nh.splice(idx,1);});
      const mt=[tile,...claim.chiPair].sort((a,b)=>a.num-b.num);
      const nm=state.melds.map((m,i)=>i===p?[...m,{type:"chi",tiles:mt,open:true}]:m);
      return {...state,hands:state.hands.map((h,i)=>i===p?sortHand(nh):h),melds:nm,currentPlayer:p,phase:"discard",
        logs:[...state.logs,{msg:`${PLAYER_NAMES[p]} CHIs`,important:true}]};
    }
    if (claim.type==="kong") {
      let rm=0;
      const nh=state.hands[p].filter(t=>{if(rm<3&&tilesMatch(t,tile)){rm++;return false;}return true;});
      const nm=state.melds.map((m,i)=>i===p?[...m,{type:"kong",tiles:[tile,tile,tile,tile],open:true}]:m);
      if (state.wall.length>0) {
        const drawn=state.wall[state.wall.length-1];
        const nw=state.wall.slice(0,-1);
        const nh2=state.hands.map((h,i)=>i===p?sortHand([...nh,drawn]):h);
        return {...state,wall:nw,hands:nh2,melds:nm,currentPlayer:p,phase:"discard",
          logs:[...state.logs,{msg:`${PLAYER_NAMES[p]} KONGs`,important:true}]};
      }
    }
    return state;
  }

  function doNextTurn(state, fromPlayer) {
    const nextP=(fromPlayer+1)%4;
    const ns={...state,currentPlayer:nextP,phase:"draw",pendingDiscard:null,pendingClaims:[],turnCount:state.turnCount+1};
    if (nextP===0) {
      if (ns.wall.length===0) return {...ns,phase:"end",overlay:{title:"DRAW — 荒牌",sub:"Wall exhausted."}};
      const drawn=ns.wall[ns.wall.length-1];
      const nw=ns.wall.slice(0,-1);
      const canWin2=checkSelfDraw({...ns,wall:nw,drawTile:drawn});
      return {...ns,wall:nw,drawTile:drawn,phase:"discard",canDeclareWin:canWin2};
    }
    return ns;
  }

  const runAiTurn = useCallback((state, player) => {
    if (state.phase!=="discard"&&state.phase!=="draw") return;
    if (state.currentPlayer!==player) return;

    let s={...state};
    if (s.phase==="draw") {
      if (s.wall.length===0){setG(p=>({...p,phase:"end",overlay:{title:"DRAW — 荒牌",sub:"Wall exhausted."}}));return;}
      const t=s.wall[s.wall.length-1];
      s={...s,wall:s.wall.slice(0,-1),hands:s.hands.map((h,i)=>i===player?sortHand([...h,t]):h),phase:"discard"};
    }

    const discard=aiChooseDiscard(s.hands[player]);
    const nh=s.hands.map((h,i)=>i===player?sortHand(h.filter(t=>t!==discard)):h);
    const na=[...s.allDiscards,{tile:discard,player}];
    const nd=s.discards.map((d,i)=>i===player?[...d,discard]:d);
    const after={...s,hands:nh,discards:nd,allDiscards:na,
      pendingDiscard:{tile:discard,player},phase:"claim",
      logs:[...s.logs,{msg:`${PLAYER_NAMES[player]} discards ${tileChar(discard)}`}]};

    const claims=buildClaims(after,discard,player);
    if (claims.some(c=>c.player===0)) {
      setG({...after,pendingClaims:claims,claimPrompt:{tile:discard,claim:claims.find(c=>c.player===0)}});
      return;
    }
    const aiClaim=bestAiClaim(claims.filter(c=>c.player!==player));
    let ns;
    if (aiClaim) {
      ns=applyAiClaim(after,aiClaim,discard);
    } else {
      ns=doNextTurn(after,player);
    }
    setG(ns);
    if (ns.phase!=="end"&&ns.currentPlayer!==0) {
      aiTimerRef.current=setTimeout(()=>runAiTurn(ns,ns.currentPlayer),700);
    }
  }, [checkSelfDraw, checkWinWithDiscard]);

  useEffect(()=>{
    if (G.phase==="draw"&&G.currentPlayer!==0&&!G.claimPrompt&&G.phase!=="end") {
      aiTimerRef.current=setTimeout(()=>runAiTurn(G,G.currentPlayer),700);
    }
    return ()=>clearTimeout(aiTimerRef.current);
  },[G.currentPlayer,G.phase,G.turnCount]);

  function handleTileClick(idx) {
    if (G.currentPlayer!==0||G.phase!=="discard") return;
    if (G.selectedTile===idx) performDiscard(idx);
    else setG(p=>({...p,selectedTile:idx}));
  }

  function handleDrawTileClick() {
    if (G.currentPlayer!==0||G.phase!=="discard") return;
    if (G.selectedTile==="draw") performDiscard("draw");
    else setG(p=>({...p,selectedTile:"draw"}));
  }

  function performDiscard(idx) {
    setG(prev=>{
      let tile, newHand;
      if (idx==="draw") {
        tile=prev.drawTile; newHand=sortHand([...prev.hands[0]]);
      } else {
        const full=prev.drawTile?sortHand([...prev.hands[0],prev.drawTile]):[...prev.hands[0]];
        tile=full[idx]; newHand=sortHand(full.filter((_,i)=>i!==idx));
      }
      const na=[...prev.allDiscards,{tile,player:0}];
      const nd=prev.discards.map((d,i)=>i===0?[...d,tile]:d);
      const after={...prev,hands:prev.hands.map((h,i)=>i===0?newHand:h),drawTile:null,
        discards:nd,allDiscards:na,pendingDiscard:{tile,player:0},phase:"claim",selectedTile:-1,
        logs:[...prev.logs,{msg:`You discard ${tileChar(tile)}`}]};

      const claims=buildClaims(after,tile,0).filter(c=>c.player!==0);
      const aiClaim=bestAiClaim(claims);
      if (aiClaim) {
        const resolved=applyAiClaim(after,aiClaim,tile);
        if (resolved.phase!=="end"&&resolved.currentPlayer!==0)
          aiTimerRef.current=setTimeout(()=>runAiTurn(resolved,resolved.currentPlayer),700);
        return resolved;
      }
      const ns=doNextTurn(after,0);
      if (ns.phase!=="end"&&ns.currentPlayer!==0)
        aiTimerRef.current=setTimeout(()=>runAiTurn(ns,ns.currentPlayer),700);
      return ns;
    });
  }

  function handleSelfDraw() {
    if (!checkSelfDraw(G)) return;
    setG(prev=>{
      const tile=prev.drawTile;
      const {fan,base}=scoreHand(prev.hands,prev.melds,prev.seatWinds,prev.roundWind,0,tile,true);
      const sc=[...prev.scores]; [1,2,3].forEach(p=>{sc[p]-=base;sc[0]+=base;});
      return {...prev,drawTile:null,scores:sc,phase:"end",
        logs:[...prev.logs,{msg:`YOU WIN self-draw! ${fan} fan`,important:true}],
        overlay:{title:"🀄 YOU WIN — SELF DRAW!",
          sub:`${fan} Fan · ${base} pts from each\n\nYou:${sc[0]} | West:${sc[1]} | North:${sc[2]} | East:${sc[3]}`}};
    });
  }

  function handleClaimAction(type, chiPair=null) {
    const {tile,player:fromP}=G.pendingDiscard;
    setG(prev=>{
      if (type==="win") {
        const {fan,base}=scoreHand(prev.hands,prev.melds,prev.seatWinds,prev.roundWind,0,tile,false);
        const sc=[...prev.scores]; sc[fromP]-=base; sc[0]+=base;
        return {...prev,scores:sc,phase:"end",claimPrompt:null,
          logs:[...prev.logs,{msg:`YOU WIN! ${fan} fan`,important:true}],
          overlay:{title:"🀄 YOU WIN!",
            sub:`${fan} Fan · ${base} pts\n\nYou:${sc[0]} | West:${sc[1]} | North:${sc[2]} | East:${sc[3]}`}};
      }
      const ns=applyAiClaim({...prev,claimPrompt:null,pendingClaims:[]},{type,player:0,chiPair},tile);
      if (ns.phase!=="end"&&ns.currentPlayer!==0)
        aiTimerRef.current=setTimeout(()=>runAiTurn(ns,ns.currentPlayer),700);
      return ns;
    });
  }

  function handlePass() {
    const tile=G.pendingDiscard?.tile;
    setG(prev=>{
      const aiClaim=bestAiClaim(prev.pendingClaims.filter(c=>c.player!==0));
      const base={...prev,claimPrompt:null,pendingClaims:[]};
      if (aiClaim) {
        const ns=applyAiClaim(base,aiClaim,tile);
        if (ns.phase!=="end"&&ns.currentPlayer!==0)
          aiTimerRef.current=setTimeout(()=>runAiTurn(ns,ns.currentPlayer),700);
        return ns;
      }
      const ns=doNextTurn(base,prev.pendingDiscard.player);
      if (ns.phase!=="end"&&ns.currentPlayer!==0)
        aiTimerRef.current=setTimeout(()=>runAiTurn(ns,ns.currentPlayer),700);
      return ns;
    });
  }

  function handleNewGame() {
    clearTimeout(aiTimerRef.current);
    setG(createInitialState());
  }

  // Derived
  const cp=G.currentPlayer;
  const PHASE_LABELS={draw:"DRAW A TILE",discard:"DISCARD A TILE",claim:"WAITING...",end:"ROUND OVER"};
  let claimFan=null;
  if (G.claimPrompt?.claim?.canWin&&G.pendingDiscard) {
    const {fan}=scoreHand(G.hands,G.melds,G.seatWinds,G.roundWind,0,G.pendingDiscard.tile,false);
    claimFan=fan;
  }
  let selfDrawFan=null;
  if (G.drawTile&&checkSelfDraw(G)) {
    const {fan}=scoreHand(G.hands,G.melds,G.seatWinds,G.roundWind,0,G.drawTile,true);
    selfDrawFan=fan;
  }

  // ─── RENDER ────────────────────────────────
  const gold="rgba(201,168,76,0.2)";
  const activeGlow=(side)=>({
    left:"inset 3px 0 0 #c9a84c,inset 0 0 20px "+gold,
    right:"inset -3px 0 0 #c9a84c,inset 0 0 20px "+gold,
    top:"inset 0 3px 0 #c9a84c",
    bottom:"inset 0 -3px 0 #c9a84c,inset 0 0 20px "+gold,
  }[side]);

  const btn=(variant="")=>({
    fontFamily:"inherit",
    background:variant==="primary"?"rgba(201,168,76,0.2)":"transparent",
    border:`1.5px solid ${variant==="danger"?"#d63031":variant==="primary"?"#e8c96d":"#c9a84c"}`,
    color:variant==="danger"?"#d63031":variant==="primary"?"#e8c96d":"#c9a84c",
    padding:"8px 18px",fontSize:"0.78rem",letterSpacing:"0.12em",cursor:"pointer",
    borderRadius:2,minWidth:110,transition:"all 0.2s",
  });

  return (
    <div style={{background:"#0d2b1f",minHeight:"100vh",height:"100vh",fontFamily:"'Noto Serif SC',serif",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes pip{0%,100%{transform:scale(1);box-shadow:0 0 6px rgba(201,168,76,.7)}50%{transform:scale(1.4);box-shadow:0 0 14px rgba(201,168,76,1)}}
        button:hover{filter:brightness(1.2)}
      `}</style>

      {/* Corner decos */}
      {[{t:8,l:8,bw:"1px 0 0 1px"},{t:8,r:8,bw:"1px 1px 0 0"},{b:8,l:8,bw:"0 0 1px 1px"},{b:8,r:8,bw:"0 1px 1px 0"}].map((s,i)=>(
        <div key={i} style={{position:"fixed",width:40,height:40,borderColor:"rgba(201,168,76,0.2)",borderStyle:"solid",pointerEvents:"none",zIndex:1,...s,bw:undefined,borderWidth:s.bw}}/>
      ))}

      {/* Game grid */}
      <div style={{display:"grid",gridTemplateAreas:`"ti ti ti" "la c ra" "bh bh bh"`,gridTemplateRows:"auto 1fr auto",gridTemplateColumns:"220px 1fr 220px",width:"100%",maxWidth:1200,height:"100%",margin:"0 auto",padding:10}}>

        {/* TOP INFO */}
        <div style={{gridArea:"ti",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 16px",borderBottom:"1px solid rgba(201,168,76,0.2)"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:"#c9a84c",fontSize:"1.1rem",letterSpacing:"0.2em"}}>香港麻雀 · Hong Kong Mahjong</div>
          <div style={{display:"flex",alignItems:"center",gap:20,color:"#e8c96d",fontSize:"0.8rem",letterSpacing:"0.1em"}}>
            <span>{WIND_NAMES[G.roundWind]} Round {G.roundNum}</span>
            <div style={{background:"rgba(201,168,76,0.15)",border:"1px solid #c9a84c",padding:"4px 14px",color:"#c9a84c",letterSpacing:"0.15em"}}>{WIND_KANJI[G.roundWind]}</div>
            <span>Wall: <strong style={{color:"#c9a84c"}}>{G.wall.length}</strong></span>
          </div>
          <div style={{display:"flex",gap:20}}>
            {["You","West","North","East"].map((nm,i)=>(
              <div key={i} style={{textAlign:"center",fontSize:"0.7rem",color:"rgba(201,168,76,0.6)"}}>
                {nm}<span style={{display:"block",fontSize:"1rem",color:"#c9a84c",fontWeight:700}}>{G.scores[i]}</span>
              </div>
            ))}
          </div>
          <button style={{...btn(),padding:"5px 12px",fontSize:"0.65rem",minWidth:80, margin:"0 4px"}} onClick={handleNewGame}>NEW GAME</button>
        </div>

        {/* LEFT — West */}
        <div style={{gridArea:"la",display:"flex",flexDirection:"column",padding:"8px 0",boxShadow:cp===1?activeGlow("left"):"none",transition:"box-shadow 0.3s"}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:6,padding:"10px 8px"}}>
            <div style={{fontSize:"0.7rem",color:cp===1?"#e8c96d":"#c9a84c",letterSpacing:"0.15em",textAlign:"center",borderBottom:"1px solid rgba(201,168,76,0.2)",paddingBottom:4,textShadow:cp===1?"0 0 10px rgba(201,168,76,0.5)":"none",transition:"all 0.3s"}}>
              West 西 {WIND_KANJI[G.seatWinds[1]]}
            </div>
            <div style={{fontSize:"1.2rem",textAlign:"center",color:"#c9a84c"}}>西</div>
            <div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center"}}>
              {G.hands[1].map((_,i)=><BackTile key={i}/>)}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
              {G.melds[1].map((m,i)=><div key={i} style={{display:"flex",gap:2,background:"rgba(0,0,0,0.2)",padding:4,borderRadius:4,border:"1px solid rgba(201,168,76,0.2)"}}>{m.tiles.map((t,j)=><Tile key={j} tile={t} size="small"/>)}</div>)}
            </div>
            <div style={{textAlign:"center",fontSize:"0.65rem",color:"rgba(201,168,76,0.5)"}}>{G.hands[1].length} tiles</div>
          </div>
        </div>

        {/* CENTER */}
        <div style={{gridArea:"c",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
          {/* North */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,boxShadow:cp===2?activeGlow("top"):"none",borderRadius:4,padding:"4px 8px",transition:"box-shadow 0.3s"}}>
            <div style={{fontSize:"0.7rem",color:cp===2?"#e8c96d":"#c9a84c",letterSpacing:"0.15em",textShadow:cp===2?"0 0 10px rgba(201,168,76,0.5)":"none",transition:"all 0.3s"}}>
              North 北 {WIND_KANJI[G.seatWinds[2]]}
            </div>
            <div style={{display:"flex",gap:2}}>{G.hands[2].map((_,i)=><BackTile key={i}/>)}</div>
            <div style={{display:"flex",gap:4}}>
              {G.melds[2].map((m,i)=><div key={i} style={{display:"flex",gap:2,background:"rgba(0,0,0,0.2)",padding:4,borderRadius:4,border:"1px solid rgba(201,168,76,0.2)"}}>{m.tiles.map((t,j)=><Tile key={j} tile={t} size="small"/>)}</div>)}
            </div>
          </div>

          {/* Table felt */}
          <div style={{flex:1,width:"100%"}}>
            <div style={{width:"100%",height:"100%",background:"radial-gradient(ellipse at center,#2d6a4f 0%,#1b4332 60%,#0d2b1f 100%)",border:"2px solid rgba(201,168,76,0.25)",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:12,minHeight:200,position:"relative"}}>
              {/* Turn indicator */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"6px 16px",background:"rgba(0,0,0,0.35)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:4,minWidth:200}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#c9a84c",boxShadow:"0 0 8px rgba(201,168,76,0.8)",flexShrink:0,animation:"pip 1.2s ease-in-out infinite"}}/>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{fontSize:"0.95rem",fontWeight:700,letterSpacing:"0.2em",color:cp===0?"#e8c96d":"#c9a84c",textShadow:"0 0 12px rgba(201,168,76,0.7)",fontFamily:"'Playfair Display',serif",minWidth:100,textAlign:"center"}}>
                    {cp===0?"YOUR TURN":[,"WEST","NORTH","EAST"][cp]+"'S TURN"}
                  </div>
                  <div style={{fontSize:"0.6rem",color:"rgba(201,168,76,0.5)",letterSpacing:"0.2em"}}>{PHASE_LABELS[G.phase]||""}</div>
                </div>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#c9a84c",boxShadow:"0 0 8px rgba(201,168,76,0.8)",flexShrink:0,animation:"pip 1.2s ease-in-out infinite"}}/>
              </div>

              <div style={{fontSize:"0.65rem",color:"rgba(201,168,76,0.5)",letterSpacing:"0.1em",marginTop:4}}>DISCARD POOL</div>
              <div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center",maxWidth:300}}>
                {G.allDiscards.map(({tile},i)=><DiscardTile key={i} tile={tile} isLatest={i===G.allDiscards.length-1}/>)}
              </div>
              <div style={{fontSize:"0.75rem",color:"rgba(201,168,76,0.5)",letterSpacing:"0.1em"}}>Wall: {G.wall.length} tiles remaining</div>
            </div>
          </div>
        </div>

        {/* RIGHT — East */}
        <div style={{gridArea:"ra",display:"flex",flexDirection:"column",padding:"8px 0",boxShadow:cp===3?activeGlow("right"):"none",transition:"box-shadow 0.3s"}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:6,padding:"10px 8px"}}>
            <div style={{fontSize:"0.7rem",color:cp===3?"#e8c96d":"#c9a84c",letterSpacing:"0.15em",textAlign:"center",borderBottom:"1px solid rgba(201,168,76,0.2)",paddingBottom:4,textShadow:cp===3?"0 0 10px rgba(201,168,76,0.5)":"none",transition:"all 0.3s"}}>
              East 東 {WIND_KANJI[G.seatWinds[3]]}
            </div>
            <div style={{fontSize:"1.2rem",textAlign:"center",color:"#c9a84c"}}>東</div>
            <div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center"}}>
              {G.hands[3].map((_,i)=><BackTile key={i}/>)}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
              {G.melds[3].map((m,i)=><div key={i} style={{display:"flex",gap:2,background:"rgba(0,0,0,0.2)",padding:4,borderRadius:4,border:"1px solid rgba(201,168,76,0.2)"}}>{m.tiles.map((t,j)=><Tile key={j} tile={t} size="small"/>)}</div>)}
            </div>
            <div style={{textAlign:"center",fontSize:"0.65rem",color:"rgba(201,168,76,0.5)"}}>{G.hands[3].length} tiles</div>
          </div>
        </div>

        {/* BOTTOM — Player */}
        <div style={{gridArea:"bh",display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"10px 0 6px",borderTop:"1px solid rgba(201,168,76,0.2)",boxShadow:cp===0?activeGlow("bottom"):"none",transition:"box-shadow 0.3s"}}>
          <div style={{display:"flex",alignItems:"center",gap:20,fontSize:"0.7rem",color:"rgba(201,168,76,0.6)",letterSpacing:"0.15em",textShadow:cp===0?"0 0 10px rgba(201,168,76,0.4)":"none",transition:"all 0.3s"}}>
            YOUR HAND — South 南
            <div style={{background:"rgba(201,168,76,0.15)",border:"1px solid #c9a84c",color:"#c9a84c",padding:"3px 10px",fontSize:"1rem"}}>{WIND_KANJI[G.seatWinds[0]]}</div>
          </div>

          {G.melds[0].length>0&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
              {G.melds[0].map((m,i)=><div key={i} style={{display:"flex",gap:2,background:"rgba(0,0,0,0.2)",padding:4,borderRadius:4,border:"1px solid rgba(201,168,76,0.2)"}}>{m.tiles.map((t,j)=><Tile key={j} tile={t} size="normal"/>)}</div>)}
            </div>
          )}

          <div style={{display:"flex",gap:3,alignItems:"flex-end",flexWrap:"wrap",justifyContent:"center"}}>
            {G.hands[0].map((tile,i)=>(
              <Tile key={tile.id} tile={tile} size="normal" selected={G.selectedTile===i} onClick={()=>handleTileClick(i)}/>
            ))}
            {G.drawTile&&<Tile tile={G.drawTile} size="normal" isNew selected={G.selectedTile==="draw"} onClick={handleDrawTileClick}/>}
          </div>

          {selfDrawFan!==null&&(
            <div style={{display:"flex",gap:8}}>
              <button style={btn("primary")} onClick={handleSelfDraw}>WIN 自摸 ({selfDrawFan} fan)</button>
            </div>
          )}
        </div>
      </div>

      {/* Claim prompt */}
      {G.claimPrompt&&(
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"linear-gradient(135deg,#1a0d05,#0a0a00)",border:"1.5px solid #c9a84c",padding:"20px 30px",zIndex:150,display:"flex",flexDirection:"column",alignItems:"center",gap:14,boxShadow:"0 0 40px rgba(0,0,0,0.8)",minWidth:240}}>
          <div style={{color:"#c9a84c",fontSize:"0.85rem",letterSpacing:"0.2em"}}>CLAIM DISCARD?</div>
          <div style={{background:"#f8f0dc",borderRadius:5,overflow:"hidden"}}>
            <TileArt tile={G.claimPrompt.tile} w={52} h={72}/>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
            {G.claimPrompt.claim.canWin&&<button style={btn("primary")} onClick={()=>handleClaimAction("win")}>WIN 和牌{claimFan!==null?` (${claimFan} fan)`:""}</button>}
            {G.claimPrompt.claim.canKong&&<button style={btn()} onClick={()=>handleClaimAction("kong")}>KONG 槓</button>}
            {G.claimPrompt.claim.canPung&&<button style={btn()} onClick={()=>handleClaimAction("pung")}>PUNG 碰</button>}
            {G.claimPrompt.claim.canChi.map((pair,i)=>(
              <button key={i} style={btn()} onClick={()=>handleClaimAction("chi",pair)}>CHI 吃 {pair.map(t=>tileChar(t)).join("")}</button>
            ))}
            <button style={btn("danger")} onClick={handlePass}>PASS 過</button>
          </div>
        </div>
      )}

      {/* Win overlay */}
      {G.overlay&&(
        <div style={{position:"fixed",inset:0,background:"rgba(5,15,8,0.92)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20,zIndex:200}}>
          <div style={{fontSize:"2.8rem",color:"#c9a84c",fontFamily:"'Playfair Display',serif",textShadow:"0 0 30px rgba(201,168,76,0.5)",letterSpacing:"0.2em"}}>{G.overlay.title}</div>
          <div style={{fontSize:"0.9rem",color:"#e8c96d",letterSpacing:"0.15em",textAlign:"center",whiteSpace:"pre-line",maxWidth:440}}>{G.overlay.sub}</div>
          <div style={{display:"flex",gap:16}}>
            <button style={btn("primary")} onClick={handleNewGame}>NEW GAME</button>
            <button style={btn()} onClick={()=>setG(p=>({...p,overlay:null}))}>CLOSE</button>
          </div>
        </div>
      )}

      {/* Min fan selector */}
      <div style={{position:"fixed",bottom:18,right:18,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,zIndex:50}}>
        <div style={{fontSize:"0.6rem",letterSpacing:"0.2em",color:"rgba(201,168,76,0.5)",textTransform:"uppercase"}}>MIN. POINTS TO WIN</div>
        <div style={{display:"flex",gap:4}}>
          {[0,1,2,3].map(v=>(
            <button key={v} onClick={()=>setMinFan(v)} style={{fontFamily:"inherit",width:32,height:32,background:minFan===v?"rgba(201,168,76,0.18)":"transparent",border:minFan===v?"1px solid #c9a84c":"1px solid rgba(201,168,76,0.35)",color:minFan===v?"#c9a84c":"rgba(201,168,76,0.45)",fontSize:"0.85rem",cursor:"pointer",borderRadius:2,padding:0,fontWeight:minFan===v?700:400}}>{v}</button>
          ))}
        </div>
        <div style={{fontSize:"0.58rem",color:"rgba(201,168,76,0.35)",letterSpacing:"0.1em",fontStyle:"italic"}}>{MF_DESCS[minFan]}</div>
      </div>

      {/* Log */}
      <div style={{position:"fixed",bottom:10,left:10,width:200,maxHeight:100,overflowY:"auto",fontSize:"0.62rem",letterSpacing:"0.05em",lineHeight:1.5,pointerEvents:"none"}}>
        {G.logs.slice(-15).map((l,i)=>(
          <div key={i} style={{borderBottom:"1px solid rgba(201,168,76,0.1)",padding:"1px 0",color:l.important?"rgba(201,168,76,0.85)":"rgba(201,168,76,0.4)"}}>{l.msg}</div>
        ))}
      </div>
    </div>
  );
}
