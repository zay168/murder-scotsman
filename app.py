import random
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret_key_flying_scotsman'
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Game Configuration ---
# --- Game Configuration ---
STATIONS = [
    "Edinburgh", "Berwick", "Newcastle", "Durham", "Darlington", 
    "York", "Leeds", "Sheffield", "Doncaster", "Grantham", 
    "Peterborough", "Stevenage", "London"
]
MAX_TURNS = 20

# --- Questions Database (UK Rails History & Vocabulary) ---
QUESTIONS = [
    # Vocabulary
    {"q": "What do we call the separate sections of a train where passengers sit?", "a": "Carriage", "options": ["Wagon", "Carriage", "Cart", "Box"]},
    {"q": "The person who checks your ticket on the train is the...", "a": "Conductor", "options": ["Pilot", "Driver", "Conductor", "Manager"]},
    {"q": "The place where you wait for the train to arrive is the...", "a": "Platform", "options": ["Stage", "Dock", "Platform", "Deck"]},
    {"q": "What is the metal path that trains travel on called?", "a": "Tracks", "options": ["Roads", "Tracks", "Lanes", "Ways"]},
    {"q": "A piece of paper or digital code that allows you to travel is a...", "a": "Ticket", "options": ["Receipt", "Ticket", "Note", "Permit"]},
    {"q": "If a train is late, we say there is a...", "a": "Delay", "options": ["Pause", "Stop", "Delay", "Wait"]},
    {"q": "The engine that pulls the train is called a...", "a": "Locomotive", "options": ["Motor", "Locomotive", "Machine", "Puller"]},
    {"q": "A list of times when trains arrive and depart is a...", "a": "Timetable", "options": ["Menu", "Agenda", "Timetable", "Diary"]},
    {"q": "A 'One-Way' ticket is for a...", "a": "Single Journey", "options": ["Return Journey", "Single Journey", "Group Journey", "Round Trip"]},
    {"q": "The space above your seat for bags is the...", "a": "Luggage Rack", "options": ["Shelf", "Cabinet", "Luggage Rack", "Boot"]},

    # History
    {"q": "Which famous steam locomotive was the first to officially reach 100mph?", "a": "Flying Scotsman", "options": ["The Mallard", "Flying Scotsman", "The Rocket", "Thomas"]},
    {"q": "What was the name of George Stephenson's famous 1829 locomotive?", "a": "The Rocket", "options": ["The Comet", "The Rocket", "The Arrow", "The Bullet"]},
    {"q": "When did the first public railway (Stockton & Darlington) open?", "a": "1825", "options": ["1800", "1825", "1850", "1900"]},
    {"q": "What does 'LNER' stand for?", "a": "London and North Eastern Railway", "options": ["London North East Road", "London and North Eastern Railway", "Liverpool North East Rail", "Local National Express Rail"]},
    {"q": "In which era did the 'Railway Mania' investment boom occur?", "a": "1840s", "options": ["1790s", "1840s", "1920s", "1960s"]},
    {"q": "Which station in London is the terminus for the Flying Scotsman route?", "a": "King's Cross", "options": ["Paddington", "Waterloo", "King's Cross", "Euston"]},
    {"q": "What major change happened to UK railways in 1948?", "a": "Nationalisation", "options": ["Privatisation", "Nationalisation", "Closure", "Electrification"]},
    {"q": "Who was 'The Railway King' of the 1840s?", "a": "George Hudson", "options": ["Isambard Kingdom Brunel", "George Hudson", "Richard Trevithick", "Queen Victoria"]},
    {"q": "What is the 'Beeching Axe' associated with?", "a": "Closing detailed lines", "options": ["Building new lines", "Closing detailed lines", "Faster trains", "Free tickets"]},
    {"q": "The 'Mallard' holds the world speed record for steam. What speed?", "a": "126 mph", "options": ["100 mph", "112 mph", "126 mph", "140 mph"]}
]

# --- Game State ---
class GameState:
    def __init__(self):
        self.players = {}  # session_id -> Player
        self.turn_order = []
        self.current_turn_index = 0
        self.game_started = False
        self.winner = None
        self.turn_count = 0
        self.log = []

    def log_event(self, message):
        self.log.append(message)
        socketio.emit('game_log', {'message': message})

    def next_turn(self):
        if not self.players: return
        self.current_turn_index = (self.current_turn_index + 1) % len(self.turn_order)
        self.turn_count += 1
        
        # Check Turn Limit for Killer Win (if implemented strictly as per prompt "prevent Detective... 15 turns")
        # For now, we trust the game flow.
        
        # Skip frozen players
        current_player_id = self.turn_order[self.current_turn_index]
        player = self.players.get(current_player_id)
        
        if player and player.frozen_turns > 0:
            player.frozen_turns -= 1
            self.log_event(f"{player.name} is frozen for {player.frozen_turns} more turns.")
            socketio.emit('update_state', self.get_public_state())
            self.next_turn()
        else:
            socketio.emit('update_state', self.get_public_state())
            socketio.emit('your_turn', {'player_id': current_player_id})

    def get_public_state(self):
        return {
            'players': {pid: p.to_dict() for pid, p in self.players.items()},
            'current_turn': self.turn_order[self.current_turn_index] if self.turn_order else None,
            'game_started': self.game_started,
            'winner': self.winner,
            'log': self.log[-10:] # Last 10 messages
        }

class Player:
    def __init__(self, session_id, name):
        self.session_id = session_id
        self.name = name
        self.role = "Passenger" # Default
        self.position = 0 # Index in STATIONS
        self.frozen_turns = 0
        self.is_connected = True
        self.has_accused = False
        self.is_ready = False # New Ready State

    def to_dict(self):
        return {
            'name': self.name,
            'position': self.position,
            'station_name': STATIONS[self.position] if self.position < len(STATIONS) else "London",
            'is_frozen': self.frozen_turns > 0,
            'id': self.session_id,
            'is_ready': self.is_ready
            # Role is HIDDEN from public state
        }

game = GameState()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in game.players:
        game.players[request.sid].is_connected = False
        game.log_event(f"{game.players[request.sid].name} disconnected.")
        socketio.emit('update_state', game.get_public_state())

@socketio.on('join_game')
def handle_join(data):
    if game.game_started:
        # Spectator Mode Logic
        join_room('game_room')
        emit('join_success', {'my_id': request.sid})
        emit('spectator_mode', game.get_public_state())
        return

    name = data.get('name', f"Guest {len(game.players) + 1}")
    new_player = Player(request.sid, name)
    game.players[request.sid] = new_player
    game.turn_order.append(request.sid)
    
    join_room('game_room')
    game.log_event(f"{name} has boarded the train.")
    emit('update_state', game.get_public_state(), broadcast=True)
    emit('join_success', {'my_id': request.sid})

@socketio.on('toggle_ready')
def handle_toggle_ready():
    if game.game_started:
        return
    player = game.players.get(request.sid)
    if player:
        player.is_ready = not player.is_ready
        # Log to chat so everyone sees
        status = "READY" if player.is_ready else "NOT READY"
        game.log_event(f"{player.name} is {status}.")
        socketio.emit('update_state', game.get_public_state())

@socketio.on('start_game')
def handle_start():
    if game.game_started or len(game.players) < 2: 
        return
    
    # Check readiness
    if not all(p.is_ready for p in game.players.values()):
        # Ideally warn the user who tried to start, but for now just ignore or log
        # We will handle the button visibility on frontend instead
        return

    game.game_started = True
    ids = list(game.players.keys())
    random.shuffle(ids)
    game.turn_order = ids
    
    # Assign Roles
    roles = ['Killer', 'Detective']
    passengers_needed = len(ids) - 2
    for _ in range(passengers_needed):
        roles.append('Passenger')
    
    random.shuffle(roles)
    
    for i, pid in enumerate(ids):
        game.players[pid].role = roles[i]
        # Send private role info
        socketio.emit('role_assigned', {'role': roles[i]}, room=pid)
    
    game.log_event("The train is departing from Edinburgh! Roles have been assigned.")
    game.log_event(f"Turn 1 begins with {game.players[game.turn_order[0]].name}.")
    
    socketio.emit('update_state', game.get_public_state())
    socketio.emit('your_turn', {'player_id': game.turn_order[0]})

@socketio.on('roll_dice')
def handle_roll():
    if request.sid != game.turn_order[game.current_turn_index]:
        return
    
    # Balance update: 1-3 to extend game length
    roll = random.randint(1, 3)
    question = random.choice(QUESTIONS)
    
    socketio.emit('dice_rolled', {'roll': roll, 'player': game.players[request.sid].name})
    emit('question_phase', {'question': question, 'roll': roll}) # Only to current player

@socketio.on('submit_answer')
def handle_answer(data):
    if request.sid != game.turn_order[game.current_turn_index]:
        return
    
    correct = data.get('correct')
    roll = data.get('roll')
    player = game.players[request.sid]
    
    if correct:
        game.log_event(f"{player.name} answered correctly!")
        emit('action_phase', {'role': player.role, 'roll': roll})
    else:
        game.log_event(f"{player.name} answered incorrectly and misses their turn.")
        game.next_turn()

@socketio.on('perform_move')
def handle_move(data):
    if request.sid != game.turn_order[game.current_turn_index]:
        return
    
    player = game.players[request.sid]
    steps = data.get('steps')
    
    player.position += steps
    game.log_event(f"{player.name} moved {steps} stops towards London.")
    
    # Check Win Condition
    if player.position >= len(STATIONS) - 1:
        player.position = len(STATIONS) - 1
        handle_win(player)
        return
    
    game.next_turn()

@socketio.on('perform_sabotage')
def handle_sabotage(data):
    # Killer Mechanic
    if request.sid != game.turn_order[game.current_turn_index]:
        return
    
    player = game.players[request.sid]
    if player.role != 'Killer':
        return # Cheating attempt
    
    target_id = data.get('target_id')
    target = game.players.get(target_id)
    
    if target:
        target.position = max(0, target.position - 2)
        # Log masks the source to some extent, but turn order reveals it
        # Requirement: "UI gives them a choice... represented in chat log as 'The tracks were tampered with!'"
        game.log_event(f" !!! SABOTAGE !!! The tracks were tampered with! {target.name} was forced back 2 stops!")
        # Killer does NOT move when sabotaging (implied by "Option 2... Sabotage: Do NOT move")
    
    game.next_turn()

@socketio.on('perform_accuse')
def handle_accuse(data):
    # Detective Mechanic
    if request.sid != game.turn_order[game.current_turn_index]:
        return

    player = game.players[request.sid]
    if player.role != 'Detective' or player.has_accused:
        return
    
    target_id = data.get('target_id')
    target = game.players.get(target_id)
    player.has_accused = True
    
    if target and target.role == 'Killer':
        game.log_event(f"DETECTIVE COMPLETED THE CASE! {player.name} correctly accused {target.name} (The Killer)!")
        game.winner = "Detective & Passengers"
        socketio.emit('game_over', {'winner': game.winner})
        game.game_started = False
    else:
        game.log_event(f"FALSE ACCUSATION! {player.name} accused {target.name if target else 'someone'}, but they were innocent!")
        player.frozen_turns = 3
        game.next_turn()

def handle_win(player):
    if player.role == 'Killer':
        game.winner = "Le Tueur"
        game.log_event(f"FIN DE LA PARTIE - LE TUEUR A DISPARU DANS LA FOULE. ({player.name} a atteint Londres)")
    elif player.role == 'Detective':
        game.winner = "Le Détective"
        game.log_event(f"LE DÉTECTIVE A SÉCURISÉ LA GARE ! {player.name} a atteint Londres pour attraper le tueur !")
    else:
        game.winner = "Les Passagers"
        game.log_event(f"SURVIVANTS ! {player.name} a atteint Londres et alerté les autorités !")
    
    game.game_started = False
    socketio.emit('game_over', {'winner': game.winner})
    socketio.emit('update_state', game.get_public_state())

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)
