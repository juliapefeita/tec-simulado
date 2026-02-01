document.addEventListener('DOMContentLoaded', loadRanking);

async function loadRanking() {
    try {
        const response = await fetch('api/get_ranking.php');
        const data = await response.json();

        const tbody = document.querySelector('#ranking-table tbody');
        tbody.innerHTML = '';

        if (data.success && data.data.length > 0) {
            // --- Statistics Calculation ---
            const participants = data.data.length;
            const topScore = data.data[0].total_score; // Assumes sorted desc
            const leaderName = data.data[0].username;

            // Calc Avg
            let sum = 0;
            data.data.forEach(x => sum += parseFloat(x.total_score || 0));
            const avg = (sum / participants).toFixed(0);

            // Update Cards
            if (document.getElementById('stat-leader')) {
                document.getElementById('stat-leader').textContent = leaderName;
                document.getElementById('stat-avg').textContent = avg;
                document.getElementById('stat-total').textContent = participants;
            }

            // --- Render Table ---
            data.data.forEach((item, index) => {
                const rank = index + 1;
                let rankHtml = '';

                // CSS handles coloring now based on row index, but we add icons for top 3
                if (rank === 1) rankHtml = '<span style="font-size: 1.2em;">🥇</span>';
                else if (rank === 2) rankHtml = '<span style="font-size: 1.2em;">🥈</span>';
                else if (rank === 3) rankHtml = '<span style="font-size: 1.2em;">🥉</span>';
                else rankHtml = `<span style="font-family: var(--font-stack); font-weight: 500; color: var(--text-muted);">${rank}º</span>`;

                // Avatar (First letter)
                const safeName = (item.username || 'Usuário').toString();
                const initial = safeName.charAt(0).toUpperCase();
                const lastAttemptDate = item.last_attempt ? new Date(item.last_attempt) : null;
                const hasValidDate = lastAttemptDate && !Number.isNaN(lastAttemptDate.getTime());

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${rankHtml}</td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar">${initial}</div>
                            <span>${safeName}</span>
                        </div>
                    </td>
                    <td>
                        <span style="font-weight:700; color:#0f172a;">${item.total_score}</span> XP
                    </td>
                    <td>
                        ${hasValidDate ? lastAttemptDate.toLocaleDateString('pt-BR') : 'Sem registro'}
                        <span style="font-size:12px; color:#94a3b8;">
                            ${hasValidDate ? lastAttemptDate.toLocaleTimeString('pt-BR') : ''}
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;">Ainda não há rankings. Seja o primeiro!</td></tr>';
            // Reset stats
            if (document.getElementById('stat-leader')) {
                document.getElementById('stat-leader').textContent = "-";
                document.getElementById('stat-avg').textContent = "-";
                document.getElementById('stat-total').textContent = "0";
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
    }
}
