// ----- Constantes e estado -----
const LINES = [ [0,1,2],[3,4,5],[6,7,8], [0,3,6],[1,4,7],[2,5,8], [0,4,8],[2,4,6] ];

let board = Array(9).fill(null);     // null | 'X' | 'O'
let moves = { X: [], O: [] };        // filas por jogador (índices do tabuleiro)
let current = 'X';
let lastMoveIndex = null;            // índice da jogada mais recente
let gameOver = false;
let scores = { X: 0, O: 0 };
let round = 1;

// Bot & Replay
const state = { vsBot: true, diff: 'normal', botDelay: 250 };
const replay = { events: [], pos: 0, timer: null, playing: false };

// ----- Elementos -----
const elBoard = document.getElementById('board');
const elTurn = document.getElementById('turn');
const elScoreX = document.getElementById('score-x');
const elScoreO = document.getElementById('score-o');
const elRound = document.getElementById('round');
const btnNew = document.getElementById('btn-new');
const btnReset = document.getElementById('btn-reset');

const chkBot = document.getElementById('chk-bot');
const selDiff = document.getElementById('sel-diff');

// Replay controls
const btnRpStart = document.getElementById('rp-start');
const btnRpStep = document.getElementById('rp-step');
const btnRpPlay = document.getElementById('rp-play');
const elRpPos = document.getElementById('rp-pos');
const elRpTot = document.getElementById('rp-total');
const selRpSpeed = document.getElementById('rp-speed');

// ----- Board UI -----
function buildBoard(){
  elBoard.innerHTML = '';
  for(let i=0;i<9;i++){
    const btn = document.createElement('button');
    btn.className = 'cell';
    btn.setAttribute('data-idx', i);
    btn.setAttribute('role','gridcell');
    btn.setAttribute('aria-label', `casa ${i+1}`);
    btn.addEventListener('click', onCellClick);
    btn.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); onCellClick(e);} });
    elBoard.appendChild(btn);
  }
  render();
}

function onCellClick(e){
  if(gameOver) return;
  const idx = Number(e.currentTarget.getAttribute('data-idx'));
  humanPlay(idx);
}

function humanPlay(idx){
  if(board[idx]!==null) return;
  if(state.vsBot && current==='O') return; // bloqueia cliques durante turno do bot
  makeMove(idx, current, { record:true, animate:true });
  maybeBotTurn();
}

function maybeBotTurn(){
  if(!state.vsBot || gameOver) return;
  if(current==='O'){
    setTimeout(()=>{
      const idx = pickBotMove(state.diff);
      if(idx!=null) makeMove(idx, 'O', { record:true, animate:true });
    }, state.botDelay);
  }
}

// ----- Núcleo da jogada -----
function makeMove(idx, player, {record=false, animate=false}={}){
  if(board[idx]!==null || gameOver) return;

  // Coloca peça
  board[idx] = player;
  moves[player].push(idx);
  lastMoveIndex = idx;
  if(animate){ animatePlace(idx, player); }
  
  if(record){ replay.events.push({ type:'place', player, idx }); updateReplayUI(); }

  // Se excedeu 3 peças, remove a mais antiga
  if(moves[player].length > 3){
    const oldest = moves[player].shift();
    if(oldest !== idx){
      removePiece(oldest, player, {record, animate});
    }
  }

  // Checa vitória
  const win = checkWin(player);
  if(win){
    gameOver = true;
    scores[player]++;
    flashWin(win);
    render();
    return;
  }

  // Troca de vez
  current = player==='X' ? 'O' : 'X';
  render();
}

function removePiece(idx, player, {record=false, animate=false}={}){
  if(animate) animateRemove(idx);
  board[idx] = null;
  if(record){ replay.events.push({ type:'remove', player, idx }); updateReplayUI(); }
}

function checkWin(player){
  for(const [a,b,c] of LINES){
    if(board[a]===player && board[b]===player && board[c]===player){ return [a,b,c]; }
  }
  return null;
}

function flashWin(cells){
  cells.forEach(i=>{ elBoard.children[i].classList.add('win','pulse'); });
}

function render(){
  for(let i=0;i<9;i++){
    const el = elBoard.children[i];
    const val = board[i];
    el.classList.remove('filled','win','pulse','vanish');
    el.innerHTML = '';
    if(val){
      const span = document.createElement('span');
      span.textContent = val;
      span.className = 'piece';
      span.style.color = val==='X' ? getVar('--x') : getVar('--o');
      el.appendChild(span);
      el.classList.add('filled');

      const order = moves[val];
      const posInQueue = order.indexOf(i);
      if(posInQueue!==-1){
        const age = document.createElement('div'); age.className='age'; age.textContent=(posInQueue+1).toString(); el.appendChild(age);
      }
      if(i===lastMoveIndex){ const dot=document.createElement('div'); dot.className='last'; el.appendChild(dot); }
    }
  }
  elTurn.textContent = current;
  elScoreX.textContent = scores.X; elScoreO.textContent = scores.O; elRound.textContent = round;
  elBoard.setAttribute('aria-description', `Vez de ${current}. Placar X ${scores.X} contra O ${scores.O}. Rodada ${round}.`);
}

function animatePlace(idx, player){
  // efeito já acontece via .piece popIn ao renderizar
}
function animateRemove(idx){
  const el = elBoard.children[idx];
  if(!el) return;
  const piece = el.querySelector('.piece');
  if(piece){ piece.classList.add('vanish'); }
  else { el.classList.add('vanish'); }
  // o próximo render limpa 'vanish'
}

// ----- Nova rodada / Reset -----
function newRound(){
  board = Array(9).fill(null);
  moves = { X: [], O: [] };
  gameOver = false; lastMoveIndex = null;
  current = (round % 2 === 1) ? 'O' : 'X';
  round++;
  replay.events = []; replay.pos = 0; stopReplay(); updateReplayUI();
  render();
  maybeBotTurn();
}

function resetAll(){
  scores = { X:0, O:0 }; round = 1; current='X';
  board = Array(9).fill(null); moves = { X: [], O: [] };
  gameOver=false; lastMoveIndex=null;
  replay.events = []; replay.pos = 0; stopReplay(); updateReplayUI();
  render();
}

// ----- Bot (heurísticas simples) -----
function pickBotMove(level){
  const empties = emptyCells();
  if(empties.length===0) return null;

  const winMove = (player)=>{
    for(const i of empties){ if(wouldWin(i, player)) return i; } return null;
  };

  if(level==='easy'){
    return empties[Math.floor(Math.random()*empties.length)];
  }

  // NORMAL: ganhar > bloquear > centro > cantos > lados
  let m = winMove('O'); if(m!=null) return m;            // ganhar
  m = winMove('X'); if(m!=null) return m;                // bloquear
  if(board[4]==null) return 4;                           // centro
  const corners = empties.filter(i=>[0,2,6,8].includes(i)); if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
  return empties[0];
}

function wouldWin(idx, player){
  board[idx]=player; const ok = !!checkWin(player); board[idx]=null; return ok;
}

function emptyCells(){ const arr=[]; for(let i=0;i<9;i++){ if(board[i]==null) arr.push(i);} return arr; }

// ----- Replay -----
function updateReplayUI(){
  elRpTot.textContent = replay.events.length.toString();
  elRpPos.textContent = replay.pos.toString();
}

function applyEvent(ev, {animate=true}={}){
  if(ev.type==='place') makeMove(ev.idx, ev.player, {record:false, animate});
  else if(ev.type==='remove') removePiece(ev.idx, ev.player, {record:false, animate});
}

function resetToStart(){
  board = Array(9).fill(null); moves={X:[],O:[]}; gameOver=false; lastMoveIndex=null; current='X';
  render();
  replay.pos = 0; updateReplayUI();
}

function stepReplay(){
  if(replay.pos >= replay.events.length){ stopReplay(); return; }
  const ev = replay.events[replay.pos++]; applyEvent(ev, {animate:true}); updateReplayUI();
}

function playPauseReplay(){
  if(replay.playing){ stopReplay(); }
  else { startReplay(); }
}

function startReplay(){
  stopReplay();
  resetToStart();
  replay.playing = true; btnRpPlay.textContent = '⏸ Pausar';
  const loop = ()=>{
    if(!replay.playing){ return; }
    if(replay.pos >= replay.events.length){ stopReplay(); return; }
    stepReplay();
    replay.timer = setTimeout(loop, Number(selRpSpeed.value));
  };
  replay.timer = setTimeout(loop, Number(selRpSpeed.value));
}

function stopReplay(){
  replay.playing = false; btnRpPlay.textContent = '▶︎ Reproduzir';
  if(replay.timer){ clearTimeout(replay.timer); replay.timer=null; }
}

// ----- Utils / Eventos UI -----
function getVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name); }

btnNew.addEventListener('click', newRound);
btnReset.addEventListener('click', resetAll);
chkBot.addEventListener('change', (e)=>{ state.vsBot = e.target.checked; if(state.vsBot) maybeBotTurn(); });
selDiff.addEventListener('change', (e)=>{ state.diff = e.target.value; });

// Replay UI
btnRpStart.addEventListener('click', ()=>{ stopReplay(); resetToStart(); });
btnRpStep.addEventListener('click', ()=>{ stopReplay(); stepReplay(); });
btnRpPlay.addEventListener('click', ()=>{ playPauseReplay(); });
selRpSpeed.addEventListener('change', ()=>{ if(replay.playing){ stopReplay(); startReplay(); }});

// Atalhos
window.addEventListener('keydown', (e)=>{
  if(e.key==='p' || e.key==='P'){ e.preventDefault(); playPauseReplay(); }
  if(e.code==='Space'){ e.preventDefault(); stepReplay(); }
  if((e.ctrlKey||e.metaKey) && e.key==='Home'){ e.preventDefault(); stopReplay(); resetToStart(); }
});

// Inicializa
buildBoard();
maybeBotTurn();
