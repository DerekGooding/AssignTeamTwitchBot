const tmi = require('tmi.js'); 
const json = require('./credentials.json'); 


class Team{
	constructor(name){
		this.name = name;
		this.Wins = 0;
		this.Loses = 0;
	}
	
	DisplayStats(){	
		var winRatio = 1;
		var currentGamesPlayed = this.Wins + this.Loses;
		
		if(currentGamesPlayed > 0){
			winRatio = this.Wins / currentGamesPlayed;
		}
		
		var text = 'Team ' + this.name + ' has [' + this.Wins;
		text += this.Wins == 1 ? ' Win] ' : ' Wins] ';
		
		text += 'and [' + this.Loses;
		
		text += this.Loses == 1 ? ' Lose]! ' : ' Loses]! ';
		
		text += '(' + (winRatio * 100).toFixed(2) + '% W/L Ratio)';
		
		return text;
	}
}

//=================================================================================================================Var Definitions
var channelName = json.channels;
// Can switch twitch account that the bot takes control over by adding to array in credential.json file
var IdentityUserID = 0;

// Define configuration options
const opts = {
  identity: {
    username: json.username[IdentityUserID],
    password: json.oauthkey[IdentityUserID]
  },
  channels: [
    json.channels
  ]
};

const helpCommands = [
	'!teams ~ To check what teams are available',
	'!{TeamName} ~ To join that team (NOTE: you will be locked into that team until the teams are cleared!)',
	'!myteam ~ To check what team you are currently on',
];

var quit = false;
var canSwitchTeams = false;
var hasModAccess = false;
var totalGamesPlayed = 0;
teamInfo = [
	new Team('MomSpahgetti'),
	new Team('BetterSodium'),
	new Team('UglyFrog')
];
var teams = [];


//=================================================================================================================Code Start Point
// Create a client with our options
const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

function GetTeamIndex(name){
	var index = -1;
	for(let i = 0; i < teamInfo.length; i++){
		if(name.toLowerCase() === teamInfo[i].name.toLowerCase()){
			index = i;
			break;
		}
	}
	return index;
}

function GetTeamName(index){
	var finalText = '';
	if(index > -1 && index < teamInfo.length){
		finalText = teamInfo[index].name;
	}
	return finalText;
}

function CreateTeam(name){
	// 0 = name input error
	// 1 = team does not exsist
	// 2 = found team, do not create again
	var success = 1;
	
	if(parseInt(name) || name[0] == '!'){
		return 0;
	}
	
	// Checking if team already exsist
	for(let i = 0; i < teamInfo.length; i++){
		if(name.toLowerCase() === teamInfo[i].name.toLowerCase()){
			success = 2;
		}
	}
	
	if(success == 1){
		teamInfo.push(new Team(name));
		teams.push(Array());
	}
	
	return success;
}

function DeleteTeamByName(name){
	var teamIndex = GetTeamIndex(name); 
	
	return DeleteTeamByIndex(teamIndex);
}

function DeleteTeamByIndex(teamIndex){
	var success = false;
	
	if(teamIndex > -1 && teamIndex < teamInfo.length){
		success = true;
		teamInfo = teamInfo.filter(function(value, index, arr){ 
			return index != teamIndex;
		});
		
		teams = teams.filter(function(value, index, arr){ 
			return index != teamIndex;
		});
	}
	return success;
}

function CheckComplexCommand(target, context, command){
	if(hasModAccess){
		
		var split = command.split(" ");
				
		switch(split[0]){
			
		case '!winner':
			var teamWinnerID = -1;
			
			for(let i = 0; i < teamInfo.length; i++){
				if(split[1].toLowerCase() === teamInfo[i].name.toLowerCase()){
					totalGamesPlayed++;
					teamInfo[i].Wins++;
					teamWinnerID = i;
					break;
				}
			}
			
			if(teamWinnerID >= 0){
				client.say(target, `${teamInfo[teamWinnerID].name}'s team WON!`);
				
				for(let i = 0; i < teams.length; i++){
					if(teamWinnerID == i){
						continue;
					}
					
					teamInfo[i].Loses++;
					for(let j = 0; j < teams[i].length; j++){
						var duration = 60;
						if(split[2]){
							duration = split[2];
						}
						client.say(target, `/timeout ${teams[i][j]} ${duration} They lost... losers`);
					}
				}
			}
		break;
		
		case '!punish':			
			if(split[1].toLowerCase() === 'all'){
				totalGamesPlayed++;
				client.say(target, `Punishing ALL...`);
				for(let i = 0; i < teams.length; i++){
					teamInfo[i].Loses++;
					for(let j = 0; j < teams[i].length; j++){
						var duration = 60;
						if(split[2]){
							duration = split[2];
						}
						client.say(target, `/timeout ${teams[i][j]} ${duration} They lost... losers`);
					}
				}
			}
			else{
				var teamID = -1;
				for(let i = 0; i < teamInfo.length; i++){
					if(split[1] === teamInfo[i].name.toLowerCase()){						
						teamInfo[i].Loses++;
						teamID = i;
						break;
					}
				}
				
				if(teamID >= 0){	
					totalGamesPlayed++;				
					client.say(target, `Punishing the ${teamInfo[teamID].name}'s team`);
				
					for(let i = 0; i < teams.length; i++){
						if(teamID == i){
							continue;
						}				
						teamInfo[i].Wins++;
					}
				
					for(let i = 0; i < teams[teamID].length; i++){
						var duration = 60;
						if(split[2]){
							duration = split[2];
						}
						client.say(target, `/timeout ${teams[teamID][i]} ${duration} They lost... losers`);
					}
				}
			}
		break;
		
		case '!switchteams':
			if(split[1].toLowerCase() === 'on'){
				if(!canSwitchTeams){
					client.say(target, `Teams are unlocked, you can now switch teams`);
					canSwitchTeams = true;
				}
				else{
					client.say(target, `Team Switching is already enabled!`);
				}
			}
			else if(split[1].toLowerCase() === 'off'){
				if(canSwitchTeams){
					client.say(target, `Teams are locked, switching teams is disabled`);
					canSwitchTeams = false;
				}
				else{
					client.say(target, `Team Switching is already disabled!`);
				}
			}
		break;
		case '!deleteteam':		
			
			var name = "";			 
			if(index = parseInt(split[1])){
				index--;
				name = GetTeamName(index);
				
				if(DeleteTeamByIndex(index)){
					client.say(target, `Team ${name} has been deleted!`);
				}
				else{
					client.say(target, `Team number ${split[1]} doesn't exsist`);
				}
			}
			else if(split[1] == "all"){
				for(let i = 0; i < teamInfo.length; i++){
					client.say(target, `Team ${teamInfo[i].name} has been deleted!`);
				}
				teamInfo = [];
				teams = [];
			}
			else{
				name = GetTeamName(GetTeamIndex(split[1]));
				
				if(DeleteTeamByName(split[1])){
					client.say(target, `Team ${name} has been deleted!`);
				}
				else{
					name = split[1];
					client.say(target, `Team ${name} doesn't exsist`);
				}
			}
		break;
		case '!createteam':
			var result = CreateTeam(split[1]);
			
			switch(result){
			case 0:
				client.say(target, `${split[1]} does not work as a team name`);
			break;
			case 1:
				client.say(target, `Team ${split[1]} has been created!`);
			break;
			case 2:
			var name = GetTeamName(GetTeamIndex(split[1]));
				client.say(target, `Team ${name} already exsist!`);
			break;
			}
			
		break;
		}
	}
}

function CheckCommand(target, context, command){
	
	// ==========================================Mod Commands
	if(hasModAccess){
		switch (command) {
		case '!printteams':
			if(teamInfo.length == 0){
				client.say(target, `There are no teams!`);
			}
			for(let i = 0; i < teamInfo.length; i++){
				client.say(target, `(${teamInfo[i].Wins}W-${teamInfo[i].Loses}L)[${teamInfo[i].name} team has ${teams[i].length} members]`);
				var line = '';
				for(let j = 0; j < teams[i].length; j++){
				line += `${teams[i][j]}`;
					if(j+1 < teams[i].length){
						line += `, `;
					}
				}			
				client.say(target, line);
			}
			//console.log(`* Executed ${command}`);
		break;
		case '!clearteams':
			totalGamesPlayed = 0;
			for(let i = 0; i < teams.length; i++){
				teams[i] = [];
				teamInfo[i].Wins = 0;
				teamInfo[i].Loses = 0;
			}
			client.say(target, `teams have been cleared!`);
			break;
		}
			
	}
	// ==========================================Public commands
	switch (command) {
	case '!teams':
		client.say(target, `Here are the team lists:`);
		var line = '';
		for(let i = 0; i < teamInfo.length; i++){
			line += `${teamInfo[i].name}`;
			if(i+1 < teamInfo.length){
				line += `, `;
			}
		}
		client.say(target, line);
		break;
	case '!myteam':
		var found = false;
		for(let i = 0; i < teams.length; i++){
			if(teams[i].find((name) => name === context.username) != null){
				found = true;
				client.say(target, `${context.username}, Your team is ${teamInfo[i].name}`);
			}
		}
		if(!found){	
			client.say(target, `${context.username}, You have not picked a team yet`);
		}
		break;
	case '!help':
		client.say(target, `Here are the commands you can use:`);
		var line = '';
		for(let i = 0; i < helpCommands.length; i++){
			line += `${helpCommands[i]}`;
			if(i+1 < helpCommands[i].length){
				line += `, `;
			}
		}
		client.say(target, line);
		break;
	case '!teamstats':
		client.say(target, `===Here are the team Stats===  [Total Games: ${totalGamesPlayed}]`);
		for(let i = 0; i < teamInfo.length; i++){
			client.say(target, teamInfo[i].DisplayStats());
		}
		
		break;
	case '!myteamstats':		
		var line = `${context.username} you are not on a team!`;
		for(let i = 0; i < teams.length; i++){
				if(teams[i].find((name) => name === context.username) != null){
					line = teamInfo[i].DisplayStats();
				}
		}
		
		client.say(target, line);
		break;		
	}
}

function AssignTeam(target, context, command){	

	var success = false;
	for(let i = 0; i < teamInfo.length; i++){
		if (command.toLowerCase() === ('!' + teamInfo[i].name.toLowerCase())) {
			success = true;
			//console.log(`* Executed ${command} command by ${context.username}`);
			
			// Trying to search if the user is alrdy in a team
			for(let j = 0; j < teams.length; j++){
				if(teams[j].find((name) => name === context.username) != null){
					if(teamInfo[i].name === teamInfo[j].name){
							client.say(target, `${context.username}, You are already on team ${teamInfo[j].name}!`);
					}
					else if(canSwitchTeams){
						client.say(target, `${context.username} Abandonded team ${teamInfo[j].name} to join team ${teamInfo[i].name}!`);
						
						teams[j] = teams[j].filter(function(value, index, arr){ 
							return value != context.username;
						});

						teams[i].push(context.username);
					}
					else{
						client.say(target, `${context.username}, teams are locked! You have already joined team ${teamInfo[j].name}`);
					}
					return success;
				}
			}
			
			// Adding new user to a team			
			client.say(target, `${context.username} just joined the ${teamInfo[i].name} team!`);
			
			teams[i].push(context.username);
			break;
		}
	}
	return success;
}

function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
	
	hasModAccess = false;
	if(context.badges){
		if(context.badges['broadcaster'] | context.badges['moderator']){
			hasModAccess = true;
		}
	}

  // Remove whitespace from chat message
  const commandName = msg.trim();

	if(!AssignTeam(target, context, commandName)){
		CheckComplexCommand(target, context, commandName);
		CheckCommand(target, context, commandName);
	}

}

function ping(){
console.log("Being pinged externally");
client.say(target, `Chat is being pinged`);
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
	


  for(let i = 0; i < teamInfo.length; i++){
	  teams.push(Array());
	}
}