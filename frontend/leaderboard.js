// leaderboard.js

let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

const tbody = document.getElementById("leaderboardBody");
const addBtn = document.getElementById("addPlayerBtn");
const clearBtn = document.getElementById("clearLeaderboard");

// Add player
addBtn.addEventListener("click", () => {

    const nameInput = document.getElementById("playerName");
    const name = nameInput.value.trim();

    if (name === "") {
        alert("Please enter your name.");
        return;
    }

    // Replace these with actual game values later
    const score = Math.floor(Math.random() * 1000) + 100;
    const moves = Math.floor(Math.random() * 30) + 10;
    const time = Math.floor(Math.random() * 120) + 30;

    leaderboard.push({
        name,
        score,
        moves,
        time
    });

    leaderboard.sort((a, b) => b.score - a.score);

    localStorage.setItem(
        "leaderboard",
        JSON.stringify(leaderboard)
    );

    nameInput.value = "";

    displayLeaderboard();

});

// Display leaderboard
function displayLeaderboard() {

    tbody.innerHTML = "";

    if (leaderboard.length === 0) {

        tbody.innerHTML = `
        <tr>
            <td colspan="5">
                No Players Yet
            </td>
        </tr>
        `;

        updatePodium([]);

        return;

    }

    leaderboard.forEach((player, index) => {

        let medal = "";

        if(index===0) medal="🥇";
        else if(index===1) medal="🥈";
        else if(index===2) medal="🥉";

        tbody.innerHTML += `

        <tr>

            <td>${medal} ${index+1}</td>

            <td>${player.name}</td>

            <td>${player.score}</td>

            <td>${player.moves}</td>

            <td>${player.time}s</td>

        </tr>

        `;

    });

    updatePodium(leaderboard);

}

// Update Top 3
function updatePodium(players){

    const defaults = [
        {name:"---",score:0},
        {name:"---",score:0},
        {name:"---",score:0}
    ];

    const top = [...players];

    while(top.length < 3){
        top.push(defaults[top.length]);
    }

    document.getElementById("firstName").innerText = top[0].name;
    document.getElementById("firstScore").innerText = top[0].score+" pts";
    document.getElementById("firstAvatar").innerText = top[0].name.charAt(0).toUpperCase();

    document.getElementById("secondName").innerText = top[1].name;
    document.getElementById("secondScore").innerText = top[1].score+" pts";
    document.getElementById("secondAvatar").innerText = top[1].name.charAt(0).toUpperCase();

    document.getElementById("thirdName").innerText = top[2].name;
    document.getElementById("thirdScore").innerText = top[2].score+" pts";
    document.getElementById("thirdAvatar").innerText = top[2].name.charAt(0).toUpperCase();

}

// Clear leaderboard
clearBtn.addEventListener("click", () => {

    if(confirm("Clear the leaderboard?")){

        leaderboard = [];

        localStorage.removeItem("leaderboard");

        displayLeaderboard();

    }

});

// Load on startup
displayLeaderboard();
