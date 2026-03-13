# Dice Soldiers – Multiplayer Turn-Based Strategy Game

Dice Soldiers is a browser-based multiplayer strategy game where players upgrade their soldiers using dice rolls and compete to eliminate opponents' units.

The game supports up to **6 players in a shared room**, where each player controls **5 soldiers**. Players take turns rolling a dice to upgrade their soldiers and strategically eliminate opponents.

This project was developed with **AI-assisted development tools** to accelerate coding, refine UI, and optimize the gameplay experience.


## Game Concept

Each player starts with **5 soldiers**.

Soldiers evolve through different upgrade stages based on the **dice roll outcome**.

Upgrade progression:

Head → Body → Gun → Bullet → Attack Ability

Once a soldier reaches the final stage, the player can **eliminate an opponent's soldier**, creating a competitive strategy element.



## Dice Outcomes

The dice has **6 faces**:

1 – Upgrade Soldier 1
2 – Upgrade Soldier 2
3 – Upgrade Soldier 3
4 – Upgrade Soldier 4
5 – Upgrade Soldier 5
Joker – Skip upgrade opportunity

Each number corresponds to upgrading the matching soldier.

When a soldier reaches the final stage, they gain the ability to **remove another player's soldier from the board**.

---

## Multiplayer System

Players interact through a room-based system:

• Create a game room
• Share the room code
• Up to **6 players** can join
• Game starts once players enter the room
• Turn-based dice rolling system

The backend manages:

* Room creation
* Player joining
* Turn synchronization
* Game state updates

---

## AI-Assisted Development

AI tools were actively used during development to accelerate building and refine the product.

### ChatGPT

Used during the early development phase to:

* Structure the project architecture
* Plan game logic implementation
* Assist in coding core pages
* Debug and refine backend logic

### Cursor

Used to improve:

* UI structure
* Character visuals
* Frontend refinements
* Component organization

### Codex

Used for final polishing:

* Loading animation for server wake-up delays
* Performance improvements
* Responsiveness optimization
* Smoother gameplay flow

This workflow helped move quickly from **idea → working multiplayer game**.

---

## Features

* Multiplayer room system
* Turn-based dice gameplay
* Soldier progression mechanics
* Strategic elimination system
* Responsive UI
* Loading animation for backend wake-up
* Smooth gameplay transitions

---

## Tech Stack

Frontend
HTML
CSS
JavaScript

Backend
Node.js
Express

Hosting
Render (backend hosting)

Development Tools
ChatGPT
Cursor
Codex

---

## Deployment

The backend is currently hosted on **Render**.
Because the server sleeps when inactive, the first user may experience a short delay while the server wakes up.

A **loading animation** was implemented to handle this smoothly.

---

## Future Improvements

* Leaderboard system
* Better in-game animations
* Mobile UI enhancements
* Sound effects
* AI opponents

---

## Author

Sumanth Kuna
B.Tech CSE
