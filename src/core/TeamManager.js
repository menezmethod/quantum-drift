export const TEAM_COLORS = {
    RED: 0xff0000,
    BLUE: 0x0000ff,
    YELLOW: 0xffff00,
    GREEN: 0x00ff00,
    PURPLE: 0x800080,
    CYAN: 0x00ffff,
    ORANGE: 0xffa500,
    PINK: 0xff69b4
};

export const GAME_MODES = {
    FREE_FOR_ALL: 'FFA',
    TEAM_VS_TEAM: 'TVT',
    MULTI_TEAM: 'MT'
};

export class TeamManager {
    constructor(gameMode = GAME_MODES.FREE_FOR_ALL) {
        this.gameMode = gameMode;
        this.teams = new Map();
        this.playerTeams = new Map();
        this.teamColors = new Map();
        this.nextTeamId = 1;
        this.usedColors = new Set();
        
        // Initialize default team configurations
        this.initializeTeams();
    }

    initializeTeams() {
        switch (this.gameMode) {
            case GAME_MODES.TEAM_VS_TEAM:
                this.createTeam('RED', TEAM_COLORS.RED);
                this.createTeam('BLUE', TEAM_COLORS.BLUE);
                break;
            case GAME_MODES.MULTI_TEAM:
                this.createTeam('RED', TEAM_COLORS.RED);
                this.createTeam('BLUE', TEAM_COLORS.BLUE);
                this.createTeam('YELLOW', TEAM_COLORS.YELLOW);
                this.createTeam('GREEN', TEAM_COLORS.GREEN);
                break;
            case GAME_MODES.FREE_FOR_ALL:
                // Teams will be created dynamically as players join
                break;
        }
    }

    createTeam(name, color) {
        const teamId = this.nextTeamId++;
        this.teams.set(teamId, {
            id: teamId,
            name,
            color,
            players: new Set(),
            score: 0
        });
        this.teamColors.set(teamId, color);
        this.usedColors.add(color);
        return teamId;
    }

    generateUniqueColor() {
        const availableColors = Object.values(TEAM_COLORS)
            .filter(color => !this.usedColors.has(color));

        if (availableColors.length > 0) {
            return availableColors[Math.floor(Math.random() * availableColors.length)];
        }

        // If all predefined colors are used, generate a random color
        return Math.floor(Math.random() * 0xffffff);
    }

    assignPlayerToTeam(playerId, preferredTeamId = null) {
        if (this.gameMode === GAME_MODES.FREE_FOR_ALL) {
            // In FFA, each player gets their own team
            const color = this.generateUniqueColor();
            const teamId = this.createTeam(`Player ${playerId}`, color);
            this.playerTeams.set(playerId, teamId);
            this.teams.get(teamId).players.add(playerId);
            return { teamId, color };
        }

        if (preferredTeamId && this.teams.has(preferredTeamId)) {
            const team = this.teams.get(preferredTeamId);
            team.players.add(playerId);
            this.playerTeams.set(playerId, preferredTeamId);
            return { teamId: preferredTeamId, color: team.color };
        }

        // Auto-balance teams
        let smallestTeam = null;
        let smallestSize = Infinity;

        for (const [teamId, team] of this.teams) {
            if (team.players.size < smallestSize) {
                smallestTeam = team;
                smallestSize = team.players.size;
            }
        }

        if (smallestTeam) {
            smallestTeam.players.add(playerId);
            this.playerTeams.set(playerId, smallestTeam.id);
            return { teamId: smallestTeam.id, color: smallestTeam.color };
        }

        throw new Error('No teams available for assignment');
    }

    removePlayer(playerId) {
        const teamId = this.playerTeams.get(playerId);
        if (teamId) {
            const team = this.teams.get(teamId);
            if (team) {
                team.players.delete(playerId);
                // In FFA mode, remove empty teams
                if (this.gameMode === GAME_MODES.FREE_FOR_ALL && team.players.size === 0) {
                    this.teams.delete(teamId);
                    this.teamColors.delete(teamId);
                }
            }
            this.playerTeams.delete(playerId);
        }
    }

    getTeamColor(teamId) {
        return this.teamColors.get(teamId);
    }

    getPlayerTeam(playerId) {
        const teamId = this.playerTeams.get(playerId);
        return this.teams.get(teamId);
    }

    updateTeamScore(teamId, points) {
        const team = this.teams.get(teamId);
        if (team) {
            team.score += points;
        }
    }

    getTeamScores() {
        const scores = [];
        for (const [teamId, team] of this.teams) {
            scores.push({
                teamId,
                name: team.name,
                color: team.color,
                score: team.score,
                playerCount: team.players.size
            });
        }
        return scores.sort((a, b) => b.score - a.score);
    }

    arePlayersOnSameTeam(player1Id, player2Id) {
        return this.playerTeams.get(player1Id) === this.playerTeams.get(player2Id);
    }

    setGameMode(newMode) {
        if (newMode === this.gameMode) return;
        
        // Clear existing teams
        this.teams.clear();
        this.playerTeams.clear();
        this.teamColors.clear();
        this.usedColors.clear();
        this.nextTeamId = 1;
        
        // Set new game mode and initialize teams
        this.gameMode = newMode;
        this.initializeTeams();
    }
} 