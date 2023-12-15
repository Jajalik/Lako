//var Color = importNamespace('PixelCombats.ScriptingApi.Structures');
//var System = importNamespace('System');

// ���������
var WaitingPlayersTime = 10;
var BuildBaseTime = 30;
var GameModeTime = 600;
var EndOfMatchTime = 10;

// ��������� ����
var WaitingStateValue = "Waiting";
var BuildModeStateValue = "BuildMode";
var GameStateValue = "Game";
var EndOfMatchStateValue = "EndOfMatch";

// ���������� ����������
var mainTimer = Timers.GetContext().Get("Main");
var stateProp = Properties.GetContext().Get("State");

// ��������� ��������� �������� �������
Damage.FriendlyFire = GameMode.Parameters.GetBool("FriendlyFire");
Map.Rotation = GameMode.Parameters.GetBool("MapRotation");
BreackGraph.OnlyPlayerBlocksDmg = GameMode.Parameters.GetBool("PartialDesruction");
BreackGraph.WeakBlocks = GameMode.Parameters.GetBool("LoosenBlocks");

// ���� ������ ������ ������
BreackGraph.PlayerBlockBoost = true;

// ��������� ����
Properties.GetContext().GameModeName.Value = "GameModes/Team Dead Match";
TeamsBalancer.IsAutoBalance = true;
Ui.GetContext().MainTimerId.Value = mainTimer.Id;
// ������� �������
Teams.Add("Blue", "Teams/Blue", { b: 1 });
Teams.Add("Red", "Teams/Red", { r: 1 });
var blueTeam = Teams.Get("Blue");
var redTeam = Teams.Get("Red");
blueTeam.Spawns.SpawnPointsGroups.Add(1);
redTeam.Spawns.SpawnPointsGroups.Add(2);
blueTeam.Build.BlocksSet.Value = BuildBlocksSet.Blue;
redTeam.Build.BlocksSet.Value = BuildBlocksSet.Red;

// ������ ���� ������� ������
var maxDeaths = Players.MaxCount * 5;
Teams.Get("Red").Properties.Get("Deaths").Value = maxDeaths;
Teams.Get("Blue").Properties.Get("Deaths").Value = maxDeaths;
// ������ ��� �������� � �����������
LeaderBoard.PlayerLeaderBoardValues = [
	{
		Value: "Kills",
		DisplayName: "Statistics/Kills",
		ShortDisplayName: "Statistics/KillsShort"
	},
	{
		Value: "Deaths",
		DisplayName: "Statistics/Deaths",
		ShortDisplayName: "Statistics/DeathsShort"
	},
	{
		Value: "Spawns",
		DisplayName: "Statistics/Spawns",
		ShortDisplayName: "Statistics/SpawnsShort"
	},
	{
		Value: "Scores",
		DisplayName: "Statistics/Scores",
		ShortDisplayName: "Statistics/ScoresShort"
	}
];
LeaderBoard.TeamLeaderBoardValue = {
	Value: "Deaths",
	DisplayName: "Statistics\Deaths",
	ShortDisplayName: "Statistics\Deaths"
};
// ��� ������� � ����������
LeaderBoard.TeamWeightGetter.Set(function(team) {
	return team.Properties.Get("Deaths").Value;
});
// ��� ������ � ����������
LeaderBoard.PlayersWeightGetter.Set(function(player) {
	return player.Properties.Get("Kills").Value;
});

// ������ ��� �������� ������
Ui.GetContext().TeamProp1.Value = { Team: "Blue", Prop: "Deaths" };
Ui.GetContext().TeamProp2.Value = { Team: "Red", Prop: "Deaths" };

// ��������� ���� � ������� �� �������
Teams.OnRequestJoinTeam.Add(function(player,team){team.Add(player);});
// ����� �� ����� � �������
Teams.OnPlayerChangeTeam.Add(function(player){ player.Spawns.Spawn()});

// ������ ������� ����������� ����� ������
var immortalityTimerName="immortality";
Spawns.GetContext().OnSpawn.Add(function(player){
	player.Properties.Immortality.Value=true;
	timer=player.Timers.Get(immortalityTimerName).Restart(5);
});
Timers.OnPlayerTimer.Add(function(timer){
	if(timer.Id!=immortalityTimerName) return;
	timer.Player.Properties.Immortality.Value=false;
});

// ����� ������ ������ ������ �������� ���� ������ � �������
Properties.OnPlayerProperty.Add(function(context, value) {
	if (value.Name !== "Deaths") return;
	if (context.Player.Team == null) return;
	context.Player.Team.Properties.Get("Deaths").Value--;
});
// ���� � ������� ���������� ������� ���������� �� ��������� ����
Properties.OnTeamProperty.Add(function(context, value) {
	if (value.Name !== "Deaths") return;
	if (value.Value <= 0) SetEndOfMatchMode();
});

// ������� �������
Spawns.OnSpawn.Add(function(player) {
	++player.Properties.Spawns.Value;
});
// ������� �������
Damage.OnDeath.Add(function(player) {
	++player.Properties.Deaths.Value;
});
// ������� �������
Damage.OnKill.Add(function(player, killed) {
	if (killed.Team != null && killed.Team != player.Team) {
		++player.Properties.Kills.Value;
		player.Properties.Scores.Value += 100;
	}
});

// ��������� ������������ �������
mainTimer.OnTimer.Add(function() {
	switch (stateProp.Value) {
	case WaitingStateValue:
		SetBuildMode();
		break;
	case BuildModeStateValue:
		SetGameMode();
		break;
	case GameStateValue:
		SetEndOfMatchMode();
		break;
	case EndOfMatchStateValue:
		RestartGame();
		break;
	}
});

// ������ ������ ������� ���������
SetWaitingMode();

// ��������� ����
function SetWaitingMode() {
	stateProp.Value = WaitingStateValue;
	Ui.GetContext().Hint.Value = "Hint/WaitingPlayers";
	Spawns.GetContext().enable = false;
	mainTimer.Restart(WaitingPlayersTime);
}

function SetBuildMode() 
{
	stateProp.Value = BuildModeStateValue;
	Ui.GetContext().Hint.Value = "Hint/BuildBase";
	var inventory = Inventory.GetContext();
	inventory.Main.Value = false;
	inventory.Secondary.Value = false;
	inventory.Melee.Value = true;
	inventory.Explosive.Value = false;
	inventory.Build.Value = true;

	mainTimer.Restart(BuildBaseTime);
	Spawns.GetContext().enable = true;
	SpawnTeams();
}
function SetGameMode() 
{
	stateProp.Value = GameStateValue;
	Ui.GetContext().Hint.Value = "Hint/AttackEnemies";

	var inventory = Inventory.GetContext();
	if (GameMode.Parameters.GetBool("OnlyKnives")) {
		inventory.Main.Value = false;
		inventory.Secondary.Value = false;
		inventory.Melee.Value = true;
		inventory.Explosive.Value = false;
		inventory.Build.Value = true;
	} else {
		inventory.Main.Value = true;
		inventory.Secondary.Value = true;
		inventory.Melee.Value = true;
		inventory.Explosive.Value = true;
		inventory.Build.Value = true;
	}

	mainTimer.Restart(GameModeTime);
	Spawns.GetContext().Despawn();
	SpawnTeams();
}
function SetEndOfMatchMode() {
	stateProp.Value = EndOfMatchStateValue;
	Ui.GetContext().Hint.Value = "Hint/EndOfMatch";

	var spawns = Spawns.GetContext();
	spawns.enable = false;
	spawns.Despawn();
	Game.GameOver(LeaderBoard.GetTeams());
	mainTimer.Restart(EndOfMatchTime);
}
function RestartGame() {
	Game.RestartGame();
}

function SpawnTeams() {
	var e = Teams.GetEnumerator();
	while (e.moveNext()) {
		Spawns.GetContext(e.Current).Spawn();
	}
}


// ��������� ���� � ������� �� �������
Teams.OnRequestJoinTeam.Add(function(player,team){team.Add(player);

// ������ ���������
Ui.GetContext().Hint.Value = "Привет " + player + " Писюнюнчик мой понюхай пажалуста "


Ui.GetContext().QuadsCount.Value = true;

player.Damage.FriendlyFire.Value = true;



if (player.id == "38E4EDF7E09CF5C"){

player.contextedProperties.SkinType.Value = 1;

player.contextedProperties.MaxHp.Value = 1000000;

player.Build.Pipette.Value = false;
player.Build.FloodFill.Value = false;
player.Build.FillQuad.Value = false;
player.Build.RemoveQuad.Value = false;
player.Build.BalkLenChange.Value = false;
player.Build.FlyEnable.Value = false;
player.Build.SetSkyEnable.Value = false;
player.Build.GenMapEnable.Value = false;
player.Build.ChangeCameraPointsEnable.Value = false;
player.Build.QuadChangeEnable.Value = false;
player.Build.BuildModeEnable.Value = false;
player.Build.CollapseChangeEnable.Value = false;
player.Build.RenameMapEnable.Value = false;
player.Build.ChangeMapAuthorsEnable.Value = false;
player.Build.LoadMapEnable.Value = false;
player.Build.ChangeSpawnsEnable.Value = false;
player.Build.BuildRangeEnable.Value = false;

player.inventory.Main.Value = true;
player.inventory.MainInfinity.Value = true;
player.inventory.Secondary.Value = true;
player.inventory.SecondaryInfinity.Value = true;

player.inventory.Melee.Value = true;

player.inventory.Explosive.Value = true;
player.inventory.ExplosiveInfinity.Value = false;

player.inventory.Build.Value = true;
player.inventory.BuildInfinity.Value = true;

player.Build.BlocksSet.Value = BuildBlocksSet.AllClear;

 }

});



// ����� �� ����� � �������
Teams.OnPlayerChangeTeam.Add(function(player){ player.Spawns.Spawn()


if (player.id == "38E4EDF7E09CF5C"){


player.contextedProperties.MaxHp.Value = 1000000;

player.Build.Pipette.Value = false;
player.Build.FloodFill.Value = false;
player.Build.FillQuad.Value = false;
player.Build.RemoveQuad.Value = false;
player.Build.BalkLenChange.Value = false;
player.Build.FlyEnable.Value = false;
player.Build.SetSkyEnable.Value = false;
player.Build.GenMapEnable.Value = false;
player.Build.ChangeCameraPointsEnable.Value = false;
player.Build.QuadChangeEnable.Value = false;
player.Build.BuildModeEnable.Value = false;
player.Build.CollapseChangeEnable.Value = false;
player.Build.RenameMapEnable.Value = false;
player.Build.ChangeMapAuthorsEnable.Value = false;
player.Build.LoadMapEnable.Value = false;
player.Build.ChangeSpawnsEnable.Value = false;
player.Build.BuildRangeEnable.Value = false;

player.inventory.Main.Value = true;
player.inventory.MainInfinity.Value = true;
player.inventory.Secondary.Value = true;
player.inventory.SecondaryInfinity.Value = true;

player.inventory.Melee.Value = true;

player.inventory.Explosive.Value = true;
player.inventory.ExplosiveInfinity.Value = false;

player.inventory.Build.Value = true;
player.inventory.BuildInfinity.Value = true;

player.Build.BlocksSet.Value = BuildBlocksSet.AllClear;

 }

});
// задаем макс смертей команд
var maxDeaths = Players.MaxCount * 5;
Teams.Get("Red").Properties.Get("Deaths").Value = maxDeaths;
Teams.Get("Blue").Properties.Get("Deaths").Value = maxDeaths;
// задаем что выводить в лидербордах
LeaderBoard.PlayerLeaderBoardValues = [
        {
                Value: "Kills",
                DisplayName: "C",
                ShortDisplayName: "C"
        },
        {
                Value: "Deaths",
                DisplayName: "C",
                ShortDisplayName: "C"
        },
        {
                Value: "Spawns",
                DisplayName: "C",
                ShortDisplayName: "C"
        },
        {
                Value: "Scores",
                DisplayName: "P",
                ShortDisplayName: "P"
        }
];
LeaderBoard.TeamLeaderBoardValue = {
        Value: "Deaths",
        DisplayName: "Statistics\Deaths",
        ShortDisplayName: "Statistics\Deaths"
};
// вес команды в лидерборде
LeaderBoard.TeamWeightGetter.Set(function(team) {
        return team.Properties.Get("Deaths").Value;
});
// вес игрока в лидерборде
LeaderBoard.PlayersWeightGetter.Set(function(player) {
        return player.Properties.Get("Kills").Value;
});

// счетчик спавнов
Spawns.OnSpawn.Add(function(player) {
        ++player.Properties.Spawns.Value;
});
// счетчик смертей
Damage.OnDeath.Add(function(player) {
        ++player.Properties.Deaths.Value;
});
// счетчик убийств
Damage.OnKill.Add(function(player, killed) {
        if (killed.Team != null && killed.Team != player.Team) {
                ++player.Properties.Kills.Value;
                player.Properties.Scores.Value += 10;
        }
});



var смани = AreaPlayerTriggerService.Get("смани"); 
смани.Tags = ["смани"]; 
смани.Enable = true; 
смани.OnEnter.Add(function (player, area) {

player.Properties.Scores.Value += 100000;
});

var мани = AreaPlayerTriggerService.Get("мани"); 
мани.Tags = ["мани"]; 
мани.Enable = true; 
мани.OnEnter.Add(function (player, area) {

player.Properties.Scores.Value += 100;
});

var мани2 = AreaPlayerTriggerService.Get("мани2"); 
мани2.Tags = ["мани2"]; 
мани2.Enable = true; 
мани2.OnEnter.Add(function (player, area) {

player.Properties.Scores.Value += 150;
});

var мани3 = AreaPlayerTriggerService.Get("мани3"); 
мани3.Tags = ["мани3"]; 
мани3.Enable = true; 
мани3.OnEnter.Add(function (player, area) {

player.Properties.Scores.Value += 500;
});

var ban = AreaPlayerTriggerService.Get("ban"); 
ban.Tags = ["ban"]; 
ban.Enable = true; 
ban.OnEnter.Add(function (player, area) {     

player.Spawns.Enable = false; 
player.Spawns.Despawn();
});

var спавн  = AreaPlayerTriggerService.Get("спавн");
спавн.Tags = ["спавн"];
спавн.Enable = true;
спавн.OnEnter.Add(function (player, area) {
player.Spawns.Enable = false;
player.Spawns.Despawn();

player.Spawns.Enable = true;
player.Spawns.Spawn();
});


var iTrigger = AreaPlayerTriggerService.Get("iTrigger");
iTrigger.Tags = ["ID"];
iTrigger.Enable = true;
iTrigger.OnEnter.Add(function (player, area) {
player.Ui.Hint.Value =  "твой айди " + id.player;
});



var ш = AreaPlayerTriggerService.Get("ш");
ш.Tags = ["ш"];
ш.Enable = true;
ш.OnEnter.Add(function (player, area) {

player.contextedProperties.MaxHp.Value = 65;

player.Build.Pipette.Value = false;
player.Build.FloodFill.Value = false;
player.Build.FillQuad.Value = false;
player.Build.RemoveQuad.Value = false;
player.Build.BalkLenChange.Value = false;
player.Build.FlyEnable.Value = false;
player.Build.SetSkyEnable.Value = false;
player.Build.GenMapEnable.Value = false;
player.Build.ChangeCameraPointsEnable.Value = false;
player.Build.QuadChangeEnable.Value = false;
player.Build.BuildModeEnable.Value = false;
player.Build.CollapseChangeEnable.Value = false;
player.Build.RenameMapEnable.Value = false;
player.Build.ChangeMapAuthorsEnable.Value = false;
player.Build.LoadMapEnable.Value = false;
player.Build.ChangeSpawnsEnable.Value = false;
player.Build.BuildRangeEnable.Value = false;

player.Damage.DamageIn.Value = true;

player.inventory.Main.Value = false;
player.inventory.MainInfinity.Value = false;
player.inventory.Secondary.Value = false;
player.inventory.SecondaryInfinity.Value = false;
player.inventory.Melee.Value = false;
player.inventory.Explosive.Value = false;
player.inventory.ExplosiveInfinity.Value = false;
player.inventory.Build.Value = false;
player.inventory.BuildInfinity.Value = false;

});
var ad = AreaPlayerTriggerService.Get("ad");
ad.Tags = ["ad"];
ad.Enable = true;
ad.OnEnter.Add(function (player, area) {
player.Build.Pipette.Value = true;
player.Build.FloodFill.Value = true;
player.Build.FillQuad.Value = true;
player.Build.RemoveQuad.Value = true;
player.Build.BalkLenChange.Value = true;
player.Build.FlyEnable.Value = true;
player.Build.SetSkyEnable.Value = true;
player.Build.GenMapEnable.Value = true;
player.Build.ChangeCameraPointsEnable.Value = true;
player.Build.QuadChangeEnable.Value = true;
player.Build.BuildModeEnable.Value = true;
player.Build.CollapseChangeEnable.Value = true;
player.Build.RenameMapEnable.Value = true;
player.Build.ChangeMapAuthorsEnable.Value = true;
player.Build.LoadMapEnable.Value = true;
player.Build.ChangeSpawnsEnable.Value = true;
player.Build.BuildRangeEnable.Value = true;

player.Damage.DamageIn.Value = false;

player.inventory.Main.Value = true;
player.inventory.MainInfinity.Value = true;
player.inventory.Secondary.Value = true;
player.inventory.SecondaryInfinity.Value = true;

player.inventory.Melee.Value = true;

player.inventory.Explosive.Value = true;
player.inventory.ExplosiveInfinity.Value = true;

player.inventory.Build.Value = true;
player.inventory.BuildInfinity.Value = true;

player.Build.FlyEnable.Value = true;
player.Build.BuildRangeEnable.Value = true;

Build.BlocksSet.Value = BuildBlocksSet.AllClear;
});



var p = AreaPlayerTriggerService.Get("p");
p.Tags = ["p"];
p.Enable = true;
p.OnEnter.Add(function (player, area) {
RestartGame();
});

var не = AreaPlayerTriggerService.Get("не")
не.Tags = ["не"];
не.Enable = true;
не.OnEnter.Add(function (player, area) {

player.Damage.DamageIn.Value = true;
});

var н = AreaPlayerTriggerService.Get("н")
н.Tags = ["н"];
н.Enable = true;
н.OnEnter.Add(function (player, area) {

player.Damage.DamageIn.Value = false;
});


var odmiin = AreaPlayerTriggerService.Get("odmiin");
odmiin.Tags = ["odmiin"];
odmiin.Enable = true;
odmiin.OnEnter.Add(function (player, area) {

player.inventory.Main.Value = true;
player.inventory.MainInfinity.Value = true;
player.inventory.Secondary.Value = true;
player.inventory.SecondaryInfinity.Value = true;

player.inventory.Melee.Value = true;

player.inventory.Explosive.Value = true;
player.inventory.ExplosiveInfinity.Value = true;

player.inventory.Build.Value = true;
player.inventory.BuildInfinity.Value = true;

player.Build.FlyEnable.Value = true;
player.Damage.DamageIn.Value = true;

player.Ui.Hint.Value = " ты получил админку";
});
var tr = AreaPlayerTriggerService.Get("tr");
tr.Tags = ["tr"];
tr.Enable = true;
tr.OnEnter.Add(function (player, area) {

player.inventory.Explosive.Value = true;
player.inventory.ExplosiveInfinity.Value = true;

player.contextedProperties.inventoryType.Value = 1;

});
var ttr = AreaPlayerTriggerService.Get("ttr");
ttr.Tags = ["ttr"];
ttr.Enable = true;
ttr.OnEnter.Add(function (player, area) {
player.contextedProperties.inventoryType.Value = false;
});
var зомби = AreaPlayerTriggerService.Get("зомби");
зомби.Tags = ["зо"];
зомби.Enable = true;
зомби.OnEnter.Add(function (player, area) {
player.contextedProperties.SkinType.Value = 1;
});
var зэк = AreaPlayerTriggerService.Get("зэк");
зэк.Tags = ["з"];
зэк.Enable = true;
зэк.OnEnter.Add(function (player, area) {
player.contextedProperties.SkinType.Value = 2;
});

var деф = AreaPlayerTriggerService.Get("деф");
деф.Tags = ["деф"];
деф.Enable = true;
деф.OnEnter.Add(function (player, area) {
player.contextedProperties.SkinType.Value = 3;
});

var рпг = AreaPlayerTriggerService.Get("рпг");  
рпг.Tags = ["рпг"];  
рпг.Enable = true;  
рпг.OnEnter.Add(function(player, area){

if(player.Properties.Scores.Value >= 299999){ 
player.Ui.Hint.Value = "Гранаты Твои"; 
player.Properties.Scores.Value -= 299999; 
player.Inventory.Explosive.Value = true;
}else{ 
player.Ui.Hint.Value = "299999 Рублей = стоят гранаты, ваш баланс: " + player.Properties.Scores.Value; 
} 
});

var нож = AreaPlayerTriggerService.Get("нож");  
нож.Tags = ["нож"];
нож.Enable = true; 
нож.OnEnter.Add(function(player, area){

if(player.Properties.Scores.Value >= 49000){ 
player.Ui.Hint.Value = "куплен нож"; 
player.Properties.Scores.Value -= 49000; 
player.Inventory.Melee.Value = true;
}else{
player.Ui.Hint.Value = "49000 рублей  = Стоит нож, ваш баланс: " + player.Properties.Scores.Value; 
} 
});

var блоки = AreaPlayerTriggerService.Get("блоки");
блоки.Tags = ["блоки"];
блоки.Enable = true;
блоки.OnEnter.Add(function(player, area){

if(player.Properties.Scores.Value >= 600000){ 
player.Ui.Hint.Value = "куплены блоки"; 
player.Properties.Scores.Value -= 600000; 
player.inventory.Build.Value = true;
player.Build.BlocksSet.Value = BuildBlocksSet.Blue;
}else{ 
player.Ui.Hint.Value = "600000 Рублей = Разрешение на стройку и материалы, ваш баланс: " + player.Properties.Scores.Value; 
} 
});

var дигл = AreaPlayerTriggerService.Get("дигл");  
дигл.Tags = ["дигл"];  
дигл.Enable = true;  
дигл.OnEnter.Add(function(player, area){

if(player.Properties.Scores.Value >= 130000){
player.Ui.Hint.Value = "куплено запасное оружие"; 
player.Properties.Scores.Value -= 130000; 
player.Inventory.Secondary.Value = true;
}else{

player.Ui.Hint.Value = "130000 рублей = Стоит Пистолетик, Ваш баланс : " + player.Properties.Scores.Value;
} 
});

var пулик = AreaPlayerTriggerService.Get("пулик");  
пулик.Tags = ["пулик"];  
пулик.Enable = true;  
пулик.OnEnter.Add(function(player, area){

if(player.Properties.Scores.Value >= 250000){ 
player.Ui.Hint.Value = "куплен пулик"; 
player.Properties.Scores.Value -= 250000; 
player.Inventory.Main.Value = true; 
}else{ 
player.Ui.Hint.Value = "250000 рублей = стоит основное оружие, ваш баланс: " + player.Properties.Scores.Value;
} 
});
var ин = AreaPlayerTriggerService.Get("ин");
ин.Tags = ["ин"];
ин.Enable = true;
ин.OnEnter.Add(function(player){
player.Build.BlocksSet.Value = BuildBlocksSet.Blue;
});

var ини = AreaPlayerTriggerService.Get("ини");
ини.Tags = ["ини"];
ини.Enable = true;
ини.OnEnter.Add(function(player){
player.Build.BlocksSet.Value = BuildBlocksSet.AllClear;
});

//пв 
var Door = AreaPlayerTriggerService.Get("Door"); 
Door.Tags = ["door"]; 
Door.Enable = true; 
Door.OnEnter.Add(function(player) {}); 
//пв 
var DoorOpen = AreaPlayerTriggerService.Get("DoorOpenTrigger"); 
DoorOpen.Tags = ["пульт"]; 
DoorOpen.Enable = true; 
DoorOpen.OnEnter.Add(function(player) { 
  if (player.Properties.Get("door").Value >= 1){ 
  var area = AreaService.GetByTag("door")[0]; 
  var iter = area.Ranges.GetEnumerator(); 
  iter.MoveNext(); 
  MapEditor.SetBlock(iter.Current,474); 
  player.Properties.Get("door").Value -= 75; 
  player.Ui.Hint.Value = "вы закрыли дверь"; 
  }else{ 
  var area = AreaService.GetByTag("door")[0]; 
  var iter = area.Ranges.GetEnumerator(); 
  iter.MoveNext(); 
  MapEditor.SetBlock(iter.Current,0); 
  player.Properties.Get("door").Value += 75; 
  player.Ui.Hint.Value = "вы открыли дверь"; 
  } 
});


var дверь = AreaPlayerTriggerService.Get("дверь");
дверь.Tags = ["дверь"];
дверь.Enable = true;
дверь.OnEnter.Add(function(player){

if (player.Properties.Spawns.Value >= 10000){

player.Ui.Hint.Value = " *пик*";
}else{
player.Ui.Hint.Value = "*пик* иди нафиг";

player.Spawns.Enable = false;
player.Spawns.Despawn();

player.Spawns.Enable = true;
player.Spawns.Spawn();

}

});
var key = AreaPlayerTriggerService.Get("key");
key.Tags = ["key"];
key.Enable = true;
key.OnEnter.Add(function(player){

player.Properties.Spawns += 10000;

player.Ui.Hint.Value = "ты получил пропуск";
});
// ������ ���������
Ui.getContext().Hint.Value = "Hint/BuildBase";


// ������������ ���������
var inventory = Inventory.GetContext();
inventory.Main.Value = false;
inventory.Secondary.Value = false;
inventory.Melee.Value = false;
inventory.Explosive.Value = false;
inventory.Build.Value = false;
inventory.BuildInfinity.Value = false;

// ��������� ��� ������ �����
Build.GetContext().BlocksSet.Value = BuildBlocksSet.Blue;

function RestartGame() {
        Game.RestartGame();
}

// ������������ �����
Spawns.GetContext().RespawnTime.Value = 0
