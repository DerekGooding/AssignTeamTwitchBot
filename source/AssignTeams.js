const tmi = require('tmi.js'); 
const json = require('./credentials.json'); 

var channelName = json.channels;

// Can switch twitch account that the bot takes control over by adding to array in credential.json file
var IdentityUserID = 0;

var quit = false;
var teams = [];
var canSwitchTeams = false;
var hasModAccess = false;
var totalGamesPlayed = 0;

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

class Team{
	constructor(name){
		this.TeamName = name;
		this.Wins = 0;
		this.Loses = 0;
	}
	
	DisplayStats(){	
		var winRatio = 1;
		
		if(totalGamesPlayed > 0){
			winRatio = this.Wins / totalGamesPlayed;
		}
		
		var text = 'Team ' + this.TeamName + ' has [' + this.Wins;
		if(this.Wins == 1){
			text += ' Win] ';
		}
		else{
			text += ' Wins] ';
		}
		
		text += 'and [' + this.Loses;
		
		if(this.Loses == 1){
			text += ' Lose]! ';
		}
		else{
			text += ' Loses]! ';
		}
		
		text += '(' + (winRatio * 100).toFixed(2) + '% W/L Ratio)';
		
		return text;
	}
}

const teamsNames = [
	new Team('MomSpahgetti'),
	new Team('BetterSodium'),
	new Team('UglyFrog')
];

const helpCommands = [
	'!teams ~ To check what teams are available',
	'!{TeamName} ~ To join that team (NOTE: you will be locked into that team until the teams are cleared!)',
	'!myteam ~ To check what team you are currently on',
];

// Create a client with our options
const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

function CheckComplexCommand(target, context, command){
	if(hasModAccess){
		
		var split = command.split(" ");
				
		switch(split[0]){
			
		case '!winner':
			var teamWinnerID = -1;
			
			for(let i = 0; i < teamsNames.length; i++){
				if(split[1] === teamsNames[i].TeamName.toLowerCase()){
					totalGamesPlayed++;
					teamsNames[i].Wins++;
					teamWinnerID = i;
					break;
				}
			}
			
			if(teamWinnerID >= 0){
				client.say(target, `${teamsNames[teamWinnerID].TeamName}'s team WON!`);
				
				for(let i = 0; i < teams.length; i++){
					if(teamWinnerID == i){
						continue;
					}
					
					teamsNames[i].Loses++;
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
			if(split[1] === 'all'){
				totalGamesPlayed++;
				client.say(target, `Punishing ALL...`);
				for(let i = 0; i < teams.length; i++){
					teamsNames[i].Loses++;
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
				for(let i = 0; i < teamsNames.length; i++){
					if(split[1] === teamsNames[i].TeamName.toLowerCase()){
						totalGamesPlayed++;
						teamsNames[i].Loses++;
						teamID = i;
						break;
					}
				}
				
				if(teamID >= 0){		
					client.say(target, `Punishing the ${teamsNames[teamID].TeamName}'s team`);
				
					for(let i = 0; i < teams.length; i++){
						if(teamID == i){
							continue;
						}				
						teamsNames[i].Wins++;
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
			if(split[1] === 'on'){
				if(!canSwitchTeams){
					client.say(target, `Teams are unlocked, you can now switch teams`);
					canSwitchTeams = true;
				}
				else{
					client.say(target, `Team Switching is already enabled!`);
				}
			}
			else if(split[1] === 'off'){
				if(canSwitchTeams){
					client.say(target, `Teams are locked, switching teams is disabled`);
					canSwitchTeams = false;
				}
				else{
					client.say(target, `Team Switching is already disabled!`);
				}
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
			for(let i = 0; i < teamsNames.length; i++){
				client.say(target, `(${teamsNames[i].Wins}W-${teamsNames[i].Loses}L)[${teamsNames[i].TeamName} team has ${teams[i].length} members]`);
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
				teamsNames[i].Wins = 0;
				teamsNames[i].Loses = 0;
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
		for(let i = 0; i < teamsNames.length; i++){
			line += `${teamsNames[i].TeamName}`;
			if(i+1 < teamsNames.length){
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
				client.say(target, `${context.username}, Your team is ${teamsNames[i].TeamName}`);
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
		for(let i = 0; i < teamsNames.length; i++){
			client.say(target, teamsNames[i].DisplayStats());
		}
		
		break;
	case '!myteamstats':		
		var line = `${context.username} you are not on a team!`;
		for(let i = 0; i < teams.length; i++){
				if(teams[i].find((name) => name === context.username) != null){
					line = teamsNames[i].DisplayStats();
				}
		}
		
		client.say(target, line);
		break;		
	}
}

function AssignTeam(target, context, command){	

	var success = false;
	for(let i = 0; i < teamsNames.length; i++){
		if (command === ('!' + teamsNames[i].TeamName.toLowerCase())) {
			success = true;
			//console.log(`* Executed ${command} command by ${context.username}`);
			
			// Trying to search if the user is alrdy in a team
			for(let j = 0; j < teams.length; j++){
				if(teams[j].find((name) => name === context.username) != null){
					if(teamsNames[i].TeamName === teamsNames[j].TeamName){
							client.say(target, `${context.username}, You are already on team ${teamsNames[j].TeamName}!`);
					}
					else if(canSwitchTeams){
						client.say(target, `${context.username} Abandonded team ${teamsNames[j].TeamName} to join team ${teamsNames[i].TeamName}!`);
						
						teams[j] = teams[j].filter(function(value, index, arr){ 
							return value != context.username;
						});

						teams[i].push(context.username);
					}
					else{
						client.say(target, `${context.username}, teams are locked! You have already joined team ${teamsNames[j].TeamName}`);
					}
					return success;
				}
			}
			
			// Adding new user to a team			
			client.say(target, `${context.username} just joined the ${teamsNames[i].TeamName} team!`);
			
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
  const commandName = msg.trim().toLowerCase();

	if(!AssignTeam(target, context, commandName)){
		CheckComplexCommand(target, context, commandName);
		CheckCommand(target, context, commandName);
	}

}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  for(let i = 0; i < teamsNames.length; i++){
	  teams.push(Array());
	}
}