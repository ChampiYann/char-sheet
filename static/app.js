let character, state, cls, race, background;

const skillStat = {
  acrobatics: "DEX",
  animalHandling: "WIS",
  arcana: "INT",
  athletics: "STR",
  deception: "CHA",
  history: "INT",
  insight: "WIS",
  intimidation: "CHA",
  investigation: "INT",
  medicine: "WIS",
  nature: "INT",
  perception: "WIS",
  performance: "CHA",
  persuasion: "CHA",
  religion: "INT",
  sleightOfHand: "DEX",
  stealth: "DEX",
  survival: "WIS",
};

// ---------- Helpers ----------
function saveState() {
  fetch("/api/save_state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDiceExpr(expr) {
  const m = expr.match(/(\d*)d(\d+)/i);
  if (!m) return 0;
  const n = m[1] ? parseInt(m[1]) : 1;
  const d = parseInt(m[2]);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += rollDie(d);
  return sum;
}

function rageDamageBonus() {
  for (const r of cls.rage.damageBonusByLevel) {
    if (character.level >= r.min && character.level <= r.max) return r.bonus;
  }
  return 0;
}

function getProficiencyBonus() {
  return Math.ceil((character.level) / 4 + 1);
}

function getEffectiveStat(stat) {
  const base = character.stats[stat].base;
  const racialBonus = race?.abilityBonuses?.[stat] ?? 0;
  const saveBonus = cls?.proficiency?.saves?.includes(stat) ? getProficiencyBonus() : 0;
  return {
    base,
    racialBonus,
    saveBonus,
    total: base + racialBonus,
    modifier: Math.floor((base + racialBonus - 10) / 2)
  };
}

function getEffectiveSkill(skill) {
  const stat = skillStat[skill];
  const modifier = getEffectiveStat(stat).modifier;
  const classMod = cls.proficiency.skills.includes(skill) ? getProficiencyBonus() : null;
  const bgdMod = background.proficiency.skills.includes(skill) ? getProficiencyBonus() : null;
  const totalMod = modifier + classMod + bgdMod;
  return {
    modifier,
    classMod,
    bgdMod,
    totalMod
  }
}

function maxRageCharges() {
  const x = character.level;
  return Math.floor(1.969 + 0.513 * x - 0.0331 * x * x + 0.001 * x * x * x);
}

// ---------- UI Rendering ----------
function renderHitPoints() {
  document.getElementById("hpBox").innerText = `${state.hitPoints}/${character.maxHitPoints}`;
}

function renderRest() {
  const label = document.getElementById("restInput").querySelector("label");
  label.innerHTML = "";
  label.textContent = "Hit Dice";
  for (let i = 0; i < state.spentHitDice; i++) {
    let input = document.createElement("input");
    input.type = "checkbox";
    input.style.pointerEvents = "none";
    // input.setAttribute("disabled", null);
    input.setAttribute("checked", null);
    label.appendChild(input);
  }
  for (let i = 0; i < character.level - state.spentHitDice; i++) {
    let input = document.createElement("input");
    input.type = "checkbox";
    label.appendChild(input);
  }
}

function renderConditions() {
  const appliedConditions = document.getElementById("appliedConditions");
  appliedConditions.textContent = state.conditions.length > 0
    ? state.conditions.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(", ")
    : "-";

  const conditionsForm = document.getElementById("conditionsInput");
  conditionsForm.reset();
  conditionsForm.querySelectorAll(`input[checked]`).forEach((x) => x.removeAttribute("checked"));

  for (const condition of state.conditions) {
    const checkbox = conditionsForm.querySelector(`input[name="${condition}"]`);
    checkbox.setAttribute("checked", null);
  }
}

function renderStats() {
  const grid = document.getElementById("statsGrid");

  for (const stat of Object.keys(character.stats)) {
    const s = getEffectiveStat(stat);

    const btn = grid.querySelector(`div[name="${stat}"]`);
    btn.querySelector(`.stat-mod`).textContent = s.modifier >= 0 ? "+" + s.modifier : s.modifier;
    btn.querySelector(`.stat-base`).textContent = s.total;
    btn.onclick = () => rollStat(stat);
  }

  const init = getEffectiveStat("DEX").modifier;
  document.getElementById("initiativeBox").innerText =
    (init >= 0 ? "+" : "") + init;
}

function renderSavingThrow() {
  const grid = document.getElementById("savingThrowGrid");

  for (const stat of Object.keys(character.stats)) {
    const s = getEffectiveStat(stat).modifier + getEffectiveStat(stat).saveBonus;

    const btn = grid.querySelector(`div[name="${stat}"]`);
    btn.querySelector(`.stat-mod`).textContent = s >= 0 ? "+" + s : s;
    btn.onclick = () => rollSave(stat);
  }
}

function renderSkills() {
  const grid = document.getElementById("skillGrid");

  for (const btn of grid.children) {
    const skill = btn.getAttribute("name");
    const s = getEffectiveSkill(skill);
    btn.querySelector(`.skill-mod`).textContent = s.totalMod >= 0 ? "+" + s.totalMod : s.totalMod;
    btn.onclick = () => rollSkill(skill);
  }
}

function renderRage() {
  document.getElementById("rageCharges").innerHTML = "";
  for (let i = 0; i < state.rage.usedCharges; i++) {
    let input = document.createElement("input");
    input.type = "checkbox";
    input.style.pointerEvents = "none";
    // input.setAttribute("disabled", null);
    input.setAttribute("checked", null);
    document.getElementById("rageCharges").appendChild(input);
  }
  for (let i = 0; i < maxRageCharges() - state.rage.usedCharges; i++) {
    let input = document.createElement("input");
    input.type = "checkbox";
    input.style.pointerEvents = "none";
    // input.setAttribute("disabled", null);
    document.getElementById("rageCharges").appendChild(input);
  }
  document.getElementById("rageBtn").textContent = state.rage.active ? "End rage" : "Rage";
}

function renderCombat() {
  const startTurnBtn = document.getElementById("startTurnBtn");
  if (state.combat.inCombat) {
    startTurnBtn.removeAttribute("disabled");
    document.body.style.backgroundImage = "url(/static/wp2227193-dungeons-dragons-wallpapers.jpg)";
    document.body.style.backgroundPositionX = "right";
  } else {
    startTurnBtn.setAttribute("disabled", null);
    document.body.style.backgroundImage = "url(/static/wp4110719-dnd-wallpapers.jpg)";
    document.body.style.backgroundPositionX = "center";
  }

  renderActions();
  renderBonusActions();
  // show reckless attack button
}

function renderActions() {
  const container = document.getElementById("actionsList");
  container.innerHTML = "";

  // Relentless Endurance
  const relentlessEnduranceRow = document.createElement("div");
  relentlessEnduranceRow.className = "attack-row";

  relentlessEnduranceRow.innerHTML = `
    <div class="attack-header" style="flex:1">
      <h4>Relentless Endurance</h4>
      <span class="badge">
        <input type="checkbox" name="relentlessEndurance" id="relentlessEndurance" style="pointer-events: none;" ${state.relentlessEnduranceUsed ? "checked" : ""}>
      </span>
    </div>
    <button class="action-button" ${state.hitPoints === 0 ? "" : "disabled"}>Use</button>
  `;

  relentlessEnduranceRow.querySelector("button").onclick = relentlessEndurance;
  container.appendChild(relentlessEnduranceRow);

  // Reckless Attack
  const recklessAttackRow = document.createElement("div");
  recklessAttackRow.className = "attack-row";

  recklessAttackRow.innerHTML = `
    <div class="attack-header" style="flex:1">
      <h4>Reckless Attack</h4>
      <span class="badge">
        <input type="checkbox" name="recklessAttack" id="recklessAttack" style="pointer-events: none;" ${state.recklessAttack.active ? "checked" : ""}>
      </span>
    </div>
    <button class="action-button" style="display:${state.combat.inCombat ? "block" : "none"}" ${state.combat.attackLastRound ? "disabled" : ""}>${state.recklessAttack.active ? "Don't" : "Do"}</button>
  `;

  recklessAttackRow.querySelector("button").onclick = toggleRecklessAttack;
  container.appendChild(recklessAttackRow);

  // Attacks
  for (const atk of character.attacks) {
    const row = document.createElement("div");
    row.className = "attack-row";

    row.innerHTML = `
      <div class="attack-header" style="flex:1">
        <h4>${atk.name}</h4>
        <span class="badge">
          Hit: +${getEffectiveStat(atk.toHitStat).modifier}
          ${atk.weaponTypes.some(i => cls.proficiency.weapons.includes(i)) ? `+ ${getProficiencyBonus()} (Proficiency)` : ""}<br>
          Damage: ${atk.damageDice} + ${getEffectiveStat(atk.toHitStat).modifier}
          ${state.rage.active ? "+ rage" : ""} (${atk.damageType})
        </span>
      </div>
      <button class="action-button" style="display:${state.combat.inCombat ? "block" : "none"}" >Attack</button>
    `;

    row.querySelector("button").onclick = () => performAttack(atk);
    container.appendChild(row);
  }
}

function renderBonusActions() {
  const container = document.getElementById("bonusActionsList");
  container.innerHTML = "";

  const row = document.createElement("div");
  row.className = "attack-row";

  row.innerHTML = `
      <div class="attack-header" style="flex:1">
        <h4>Rage</h4>
        <span id="rageCharges" class="badge">
        </span>
      </div>
      <button id="rageBtn" class="action-button" style="display:${state.combat.inCombat ? "block" : "none"}" ${state.combat.bonusAction ? "disabled" : ""}>Rage</button>
    `;

  row.querySelector("button").onclick = () => toggleRage();
  container.appendChild(row);

  renderRage();
}

// ---------- Conditions -------
function applyConditions() {
  const form = document.getElementById("conditionsInput");
  const checkedConditions = form.querySelectorAll(`input:checked`);
  state.conditions = [];
  state.conditions = Array.from(checkedConditions).map((x) => x.name);
  checkDangerSense();
  saveState();
}

function checkDangerSense() {
  if (state.conditions.some((x) => ["blinded", "deafened", "incapacitated"].includes(x))) {
    delete state.saveAdvantages.dangerSense;
  } else {
    state.saveAdvantages.dangerSense = cls.dangerSense.saveAdvantages;
  }
}

// ---------- Stats ------------
function rollStat(stat) {
  const s = getEffectiveStat(stat);
  const adv = Object.values(state.statAdvantages).flat().includes(stat);
  let d20 = [];
  d20.push(rollDie(20))
  if (adv) {
    d20.push(rollDie(20))
  }
  const d20Text = d20.map((x) => `${x === 20 || x === 1 ? "nat " : ""}${x}`).join(" / ");
  alert(`${stat} check${adv ? " with advantage" : ""}: ${d20Text} + ${s.modifier} = ${Math.max(...d20) + s.modifier}`)
}

function rollSave(stat) {
  const s = getEffectiveStat(stat);
  const adv = Object.values(state.saveAdvantages).flat().includes(stat);
  let d20 = [];
  d20.push(rollDie(20))
  if (adv) {
    d20.push(rollDie(20))
  }
  const d20Text = d20.map((x) => `${x === 20 || x === 1 ? "nat " : ""}${x}`).join(" / ");
  alert(`${stat} save${adv ? " with advantage" : ""}: ${d20Text} + ${s.modifier + s.saveBonus} = ${Math.max(...d20) + s.modifier + s.saveBonus}`)
}

function rollSkill(skill) {
  const s = getEffectiveSkill(skill);
  const adv = Object.values(state.skillAdvantages).flat().includes(skill);
  let d20 = [];
  d20.push(rollDie(20))
  if (adv) {
    d20.push(rollDie(20))
  }
  const d20Text = d20.map((x) => `${x === 20 || x === 1 ? "nat " : ""}${x}`).join(" / ");
  alert(`${skill} check${adv ? " with advantage" : ""}: ${d20Text} + ${s.totalMod} = ${Math.max(...d20) + s.totalMod}`)
}

// ---------- Attacks ----------
function performAttack(atk) {
  const toHitMod = getEffectiveStat(atk.toHitStat).modifier;
  const proficiencyBonus = atk.weaponTypes.some(i => cls.proficiency.weapons.includes(i)) ? getProficiencyBonus() : 0;
  const reckless = state.recklessAttack.active;
  let d20 = [];
  d20.push(rollDie(20))
  if (reckless) {
    d20.push(rollDie(20))
  }
  const d20Text = d20.map((x) => `${x === 20 || x === 1 ? "nat " : ""}${x}`).join(" / ");
  const damageRoll = rollDiceExpr(atk.damageDice);
  const rageBonus = state.rage.active ? rageDamageBonus() : 0;
  const isCrit = d20 === 20;
  let extraCritDamage = 0;

  if (
    isCrit &&
    race?.features?.some(f => f.id === "savage_attacks") &&
    atk.melee
  ) {
    extraCritDamage = rollDiceExpr(atk.damageDice);
  }

  const totalDamage =
    damageRoll + extraCritDamage + toHitMod + rageBonus;

  alert(
    `${atk.name}\n` +
    `To hit: d20 ${reckless ? "with advantage " : ""}(${d20Text}) + ${toHitMod} ${proficiencyBonus ? `+ ${proficiencyBonus} (proficiency)` : ""} = ${Math.max(...d20) + toHitMod + proficiencyBonus}\n` +
    `Damage: ${damageRoll} + ${toHitMod}${rageBonus ? " + " + rageBonus : ""} = ${totalDamage} \n` +
    `${extraCritDamage ? `+ ${extraCritDamage} (Savage Attacks)\n` : ""}`
  );

  state.combat.attackLastRound = true;
  saveState();
  renderActions();
}

function toggleRecklessAttack() {
  state.recklessAttack.active = !state.recklessAttack.active;
  saveState();
  renderActions();
}

// ---------- Rage ----------
function startRage() {
  if (maxRageCharges() - state.rage.usedCharges <= 0) {
    alert("All rage charges used");
    return;
  }
  state.rage.active = true;
  state.rage.usedCharges += 1;
  state.resistance.rage = cls.rage.resistances;
  state.statAdvantages.rage = cls.rage.statAdvantages;
  state.saveAdvantages.rage = cls.rage.saveAdvantages;
  saveState();
  alert("ENRAGED!");
}

function endRage(reason) {
  state.rage.active = false;
  delete state.resistance.rage;
  delete state.statAdvantages.rage;
  delete state.saveAdvantages.rage;
  if (reason) alert(reason);
  saveState();
  // renderRage();
}

function toggleRage() {
  state.rage.active ? endRage("You ended rage.") : startRage();
  state.combat.bonusAction = true;
  renderActions();
  renderBonusActions();
  renderRage();
}

// ---------- Combat ----------
function toggleCombat() {
  if (state.combat.inCombat) {
    state.combat.inCombat = false;
    endRage();
  } else {
    state.combat.inCombat = true;
    const initDie = rollDie(20);
    const initMod = getEffectiveStat("DEX").modifier;
    alert(`Roll initiative! \n
      ${initDie} + ${initMod} = ${initDie + initMod}`);
    // Set initiative
    state.combat.damageLastRound = false;
    state.combat.attackLastRound = false;
  }
  saveState();
  renderCombat();
}

function startTurn() {
  if (state.rage.active && (!state.combat.attackLastRound && !state.combat.damageLastRound)) {
    endRage("Rage ended: You haven't attacked or taken damage last turn");
    renderRage();
  }
  // check rage state
  state.combat.attackLastRound = false;
  state.combat.damageLastRound = false;
  state.combat.bonusAction = false;
  state.recklessAttack.active = false;
  saveState();
  renderActions();
  renderBonusActions();
}

// ---------- Rest ----------
function takeShortRest() {
  let hitPointsRegained = 0;
  const hitDice = document.getElementById("restInput").querySelectorAll("input:not([checked]):checked").length;
  for (let i = 0; i < hitDice; i++) {
    hitPointsRegained += rollDie(cls.hitDie) + getEffectiveStat("CON").modifier;
  }
  state.hitPoints = Math.min(state.hitPoints + hitPointsRegained, character.maxHitPoints);
  state.spentHitDice += hitDice;
  saveState();
  renderHitPoints();
  renderRest();
  alert(`You regained hit points`)
  // if (state.spentHitDice >= character.level) {
  //   alert("Cannot regain hit points, all hit die spent.")
  // } else {
  //   const hitPointsRegained = rollDie(cls.hitDie) + getEffectiveStat("CON").modifier;
  //   state.hitPoints = Math.min(state.hitPoints + hitPointsRegained, character.maxHitPoints);
  //   state.spentHitDice += 1;
  //   saveState();
  //   renderHitPoints();
  //   alert(`You regained hit points`)
  // }
}

function takeLongRest() {
  // reset rage charges
  state.rage.usedCharges = 0;
  // reset half the hit die in favour of player
  state.spentHitDice = Math.max(0, Math.floor(state.spentHitDice - character.level / 2));
  // regain all HP
  state.hitPoints = character.maxHitPoints;
  // reset relentless endurance
  state.relentlessEnduranceUsed = false;
  saveState();
  renderHitPoints();
  renderRest();
  renderRage();
  renderActions();
  alert(`You've taken a long rest`);
}

// ---------- HP ------------
function takeDamage() {
  const damagePoints = document.getElementById("healthPoints").value;
  const damageType = document.getElementById("damageType").value;
  const effectiveDamage =
    Object.values(state.resistance).flat().includes(damageType) ?
      Math.floor(damagePoints / 2) : damagePoints;
  state.hitPoints = Math.max(0, state.hitPoints - effectiveDamage);
  if (state.hitPoints === 0) {
    alert(`you are knocked unconsious!`);
  }
  saveState();
  renderHitPoints();
  renderActions();
}

function heal() {
  const healPoints = document.getElementById("healthPoints").value;
  state.hitPoints = Math.min(character.maxHitPoints, state.hitPoints + healPoints);
  saveState();
  renderHitPoints();
}

function relentlessEndurance() {
  state.hitPoints = 1;
  state.relentlessEnduranceUsed = true;
  saveState();
  renderHitPoints();
  renderActions();
}

// ---------- Load ----------
async function loadAll() {
  const res = await fetch("/api/load");
  const data = await res.json();

  character = data.character;
  state = data.state;
  cls = data.cls;
  race = data.race;
  background = data.background;

  document.title = `D&D Character — ${character.name}`
  document.getElementById("charName").innerText =
    `${character.name} (Lv ${character.level})`;
  document.getElementById("raceLine").textContent = race?.name ?? "";
  document.getElementById("classLine").textContent = cls?.name ?? "";
  document.getElementById("bgLine").textContent = background?.name ?? "";
  document.getElementById("armorClassBox").innerText = 10 + getEffectiveStat("DEX").modifier + getEffectiveStat("CON").modifier;

  renderHitPoints();
  renderRest();
  renderConditions();
  renderStats();
  renderSavingThrow();
  renderSkills();
  renderActions();
  renderBonusActions();
  renderCombat();
  renderRage();
  // updateUIMode();
}

// ---------- Wire events ----------
document.getElementById("toggleCombatBtn").onclick = toggleCombat;
document.getElementById("hp").onclick = () => {
  document.getElementById("hpDialog").showModal();
};
document.getElementById("conditionsBtn").onclick = () => {
  document.getElementById("conditionsDialog").showModal();
};
document.getElementById("restBtn").onclick = () => {
  document.getElementById("restDialog").showModal();
}
document.getElementById("hpDialog").addEventListener("close", (e) => {
  switch (e.target.returnValue) {
    case "heal":
      heal();
      break;
    case "damage":
      takeDamage();
      break;
    default:
      console.log(`Unknown return value: ${e.target.returnValue}`);
  };
  document.getElementById("hpInput").reset();
});
document.getElementById("conditionsDialog").addEventListener("close", (e) => {
  e.target.returnValue !== "" ? applyConditions() : null;
  renderConditions();
});
document.getElementById("restDialog").addEventListener("close", (e) => {
  switch (e.target.returnValue) {
    case "shortRest":
      takeShortRest();
      break;
    case "longRest":
      takeLongRest();
      break;
    default:
      break;
  }
});

document.getElementById("startTurnBtn").onclick = startTurn;

// tabs
const tabButtons = document.querySelectorAll(".tabs button");
const sections = document.querySelectorAll("section");

// default selected tab (first one)
function activateTab(name) {
  sections.forEach(sec => {
    sec.classList.toggle("active", sec.id === name + "Section");
  });

  tabButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === name);
  });
}

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    activateTab(btn.dataset.tab);
  });
});

// Initialize for mobile if needed
activateTab("stats");

// Kick off
loadAll();
