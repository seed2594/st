// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 60,
  width: 50,
  height: 50,
  speed: 5,
  dx: 0,
  dy: 0,
  health: 3,
  maxHealth: 3,
  level: 1,
  score: 0,
  nextLevel: 5,
  bulletSpeed: 500, // 초기 총알 발사 간격 (ms)
  bulletWidth: 10,
  bulletHeight: 20,
  attackPower: 1 // 초기 공격력
};

const bullets = [];
const enemies = [];
const items = [];
const permanentItems = [];

let gameOver = false;
let bossSpawned = false;

// 플레이어 그리기
function drawPlayer() {
  ctx.fillStyle = 'green';
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// 총알 그리기
function drawBullet(bullet) {
  ctx.fillStyle = 'red';
  ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

// 적 그리기
function drawEnemy(enemy) {
  ctx.fillStyle = enemy.isSpecial ? 'orange' : 'blue';
  ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
}

// 아이템 그리기
function drawItem(item) {
  ctx.fillStyle = item.type === 'speed' ? 'yellow' : item.type === 'power' ? 'purple' : item.type === 'destroyAll' ? 'gray' : 'white';
  ctx.fillRect(item.x, item.y, item.width, item.height);
}

// 영구 아이템 그리기
function drawPermanentItem(item) {
  ctx.fillStyle = item.type === 'permanentPower' ? 'cyan' : 'magenta';
  ctx.fillRect(item.x, item.y, item.width, item.height);
}

// 체력 그리기
function drawHealth() {
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Health: ' + player.health, 10, 20);
}

// 레벨 및 점수 그리기
function drawLevelAndScore() {
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Level: ' + player.level, 10, 40);
  ctx.fillText('Score: ' + player.score, 10, 60);
}

// 공격 속도와 크기 그리기
function drawBulletStats() {
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Bullet Speed: ' + player.bulletSpeed + 'ms', 10, 80);
  ctx.fillText('Bullet Size: ' + player.bulletWidth + 'x' + player.bulletHeight, 10, 100);
  ctx.fillText('Attack Power: ' + player.attackPower, 10, 120);
}

// 게임 오버 메시지 그리기
function drawGameOver() {
  ctx.fillStyle = 'white';
  ctx.font = '40px Arial';
  ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
}

// 화면 지우기
function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 플레이어 이동
function movePlayer() {
  player.x += player.dx;
  player.y += player.dy;

  // 벽 충돌 처리
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

// 총알 이동
function moveBullets() {
  bullets.forEach((bullet, index) => {
    bullet.y -= bullet.speed;
    if (bullet.y + bullet.height < 0) {
      bullets.splice(index, 1);
    }
  });
}

// 적 이동
function moveEnemies() {
  enemies.forEach((enemy, index) => {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      if (enemy.isBoss) {
        gameOver = true;
      } else {
        enemies.splice(index, 1);
      }
    }
  });
}

// 아이템 이동
function moveItems() {
  items.forEach((item, index) => {
    item.y += item.speed;
    if (item.y > canvas.height || (item.type === 'speed' && item.endTime < Date.now())) {
      items.splice(index, 1);
    }
  });
}

// 영구 아이템 이동
function movePermanentItems() {
  permanentItems.forEach((item, index) => {
    if (item.y > canvas.height) {
      permanentItems.splice(index, 1);
    }
  });
}

// 충돌 체크
function checkCollisions() {
  // 총알과 적 충돌
  bullets.forEach((bullet, bIndex) => {
    enemies.forEach((enemy, eIndex) => {
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        bullets.splice(bIndex, 1);
        enemy.health -= player.attackPower;
        if (enemy.health <= 0) {
          if (enemy.isBoss) {
            bossSpawned = false;
            permanentItems.push({
              x: enemy.x,
              y: enemy.y,
              width: 30,
              height: 30,
              type: 'permanentPower'
            });
          }
          enemies.splice(eIndex, 1);
          player.score++;
          if (player.score >= player.nextLevel) {
            levelUp();
          }
          if (Math.random() < 0.2) { // 20% 확률로 아이템 생성
            spawnItem(enemy.x, enemy.y);
          }
        }
      }
    });
  });

  // 아이템과 플레이어 충돌
  items.forEach((item, iIndex) => {
    if (
      player.x < item.x + item.width &&
      player.x + player.width > item.x &&
      player.y < item.y + item.height &&
      player.y + player.height > item.y
    ) {
      items.splice(iIndex, 1);
      applyItemEffect(item.type);
    }
  });

  // 영구 아이템과 플레이어 충돌
  permanentItems.forEach((item, iIndex) => {
    if (
      player.x < item.x + item.width &&
      player.x + player.width > item.x &&
      player.y < item.y + item.height &&
      player.y + player.height > item.y
    ) {
      permanentItems.splice(iIndex, 1);
      applyPermanentItemEffect(item.type);
    }
  });

  // 적과 플레이어 충돌
  enemies.forEach((enemy, eIndex) => {
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      enemies.splice(eIndex, 1);
      player.health -= 1;
      if (player.health <= 0) {
        gameOver = true;
      }
    }
  });
}

// 총알 발사
function shoot() {
  bullets.push({
    x: player.x + player.width / 2 - player.bulletWidth / 2,
    y: player.y,
    width: player.bulletWidth,
    height: player.bulletHeight,
    speed: 7
  });
}

// 적 생성
function spawnEnemy() {
  const isSpecial = Math.random() < 0.1; // 10% 확률로 특수한 적 생성
  enemies.push({
    x: Math.random() * (canvas.width - 50),
    y: 0,
    width: 50,
    height: 50,
    speed: 3,
    health: player.level + (isSpecial ? 5 : 3), // 레벨에 따라 적 체력 증가
    isSpecial: isSpecial
  });

  // 보스 생성
  if (player.level % 10 === 0 && !bossSpawned) {
    bossSpawned = true;
    enemies.push({
      x: Math.random() * (canvas.width - 100),
      y: 0,
      width: 100,
      height: 50,
      speed: 1,
      health: player.level * 2, // 레벨에 따라 보스 체력 증가
      isBoss: true
    });
  }
}

// 아이템 생성
function spawnItem(x, y) {
  const types = ['speed', 'power', 'destroyAll'];
  const type = types[Math.floor(Math.random() * types.length)];
  items.push({
    x: x,
    y: y,
    width: 20,
    height: 20,
    speed: 3,
    type: type,
    endTime: Date.now() + 5000 // 아이템 지속 시간 (5초)
  });
}

// 아이템 효과 적용
function applyItemEffect(type) {
  if (type === 'speed') {
    player.bulletSpeed = Math.max(50, player.bulletSpeed - 50); // 공격 속도 증가, 최소 50ms
    clearInterval(shootInterval);
    shootInterval = setInterval(shoot, player.bulletSpeed);
  } else if (type === 'power') {
    player.attackPower += 1; // 공격력 증가
  } else if (type === 'destroyAll') {
    enemies.length = 0; // 모든 적 제거
  }
}

// 영구 아이템 효과 적용
function applyPermanentItemEffect(type) {
  if (type === 'permanentPower') {
    player.attackPower += 5; // 공격력 영구 증가
  }
}

// 레벨업
function levelUp() {
  player.level++;
  player.nextLevel += 5; // 다음 레벨업에 필요한 점수 증가
  player.health = player.maxHealth; // 체력 회복
  player.bulletSpeed = Math.max(50, player.bulletSpeed - 50); // 공격 속도 증가, 최소 50ms
  player.bulletWidth = Math.min(50, player.bulletWidth + 2); // 공격 크기 증가, 최대 폭 50
  player.bulletHeight = Math.min(100, player.bulletHeight + 4); // 공격 크기 증가, 최대 높이 100
  player.attackPower += 1; // 공격력 증가
  clearInterval(shootInterval);
  shootInterval = setInterval(shoot, player.bulletSpeed);
}

// 업데이트
function update() {
  if (gameOver) {
    clear();
    drawGameOver();
    return;
  }

  clear();
  drawPlayer();
  bullets.forEach(drawBullet);
  enemies.forEach(drawEnemy);
  items.forEach(drawItem);
  permanentItems.forEach(drawPermanentItem);
  drawHealth();
  drawLevelAndScore();
  drawBulletStats();
  movePlayer();
  moveBullets();
  moveEnemies();
  moveItems();
  movePermanentItems();
  checkCollisions();
  requestAnimationFrame(update);
}

// 자동 발사 설정
let shootInterval = setInterval(shoot, player.bulletSpeed); // 초기 총알 발사 간격

// 키 다운 이벤트
function keyDown(e) {
  if (e.key === 'ArrowRight' || e.key === 'Right') {
    player.dx = player.speed;
  } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
    player.dx = -player.speed;
  }
}

// 키 업 이벤트
function keyUp(e) {
  if (
    e.key === 'ArrowRight' ||
    e.key === 'Right' ||
    e.key === 'ArrowLeft' ||
    e.key === 'Left'
  ) {
    player.dx = 0;
  }
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

update();
setInterval(spawnEnemy, 1000);
