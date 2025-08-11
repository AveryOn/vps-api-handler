
/**
 * Собрать готовую страницу с таблицей для отрисовки на клиенте
 * @param tableValue html разметка `tr`/`td` с готовыми значениями
 * @returns готовый html разметка в виде строки
 */
export function initTabelClient(tableValue: string, nonce: string, sourceUrl = '/deployments', interval=5000) {
    const html = `<!DOCTYPE html>
        <html lang="ru">
        <head>
        <meta charset="UTF-8">
        <title>▶Deployment History</title>
        <style nonce="${nonce}">
            body { font-family: sans-serif; padding: 20px; }
            table { 
                border-collapse: collapse; 
                width: 100%; 
            }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
            tr:nth-child(even) { background: #fafafa; }
            tr:hover { background: #f5f5f5; }
            #td-number {
                width: 60px !important;
            }
            /* зафиксировать макс. ширину столбца и включить ellipsis */
            #td-commit-name {
                max-width: 120px !important;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        </style>
        </head>
        <body>
        <h1>▶Deployment History</h1>
        <div class="filters">
            Limit: <input type="text" id="limitInput">
            Page: <input type="text" id="pageInput">
        </div>
        <table id="tbl">
            <thead>
            <tr>
                <th>#</th><th>Commit</th><th>Hash</th><th>Branch</th>
                <th>Script</th><th>Status</th><th>Created At</th>
                <th>Side</th><
                <th>Env</th><th>Exec Time</th><th>Namespace</th><th>End At</th>
            </tr>
            </thead>
            <tbody>
            ${tableValue}
            </tbody>
        </table>
        <script nonce="${nonce}">
            const params = new URLSearchParams(window.location.search);
            const interval = Number(params.get('interval').trim()) || 5000;
            async function load() {
                const res = await fetch('${sourceUrl}' + window.location.search)
                const data = await res.json()
                const body = document.querySelector('#tbl tbody')
                body.innerHTML = data.map(d => \`
                    <tr>
                    <td id="td-number">\${d.number}</td>
                    <td id="td-commit-name">\${d.commit_name}</td>
                    <td>\${d.commit_hash}</td>
                    <td>\${d.branch}</td>
                    <td>\${d.script}</td>
                    <td>\${d.status}</td>
                    <td>\${d.created_at}</td>
                    <td>\${d.side||'-'}</td>
                    <td>\${d.environment||'-'}</td>
                    <td>\${d.execution_time||'-'}</td>
                    <td>\${d.namespace||'-'}</td>
                    <td>\${d.end_at||'-'}</td>
                    </tr>\`
                ).join('')
            }
            load()
            setInterval(load, interval)

            // Устанавливаем дефолты, если их нет
            if (!params.has('page')) params.set('page', '1');
            if (!params.has('limit')) params.set('limit', '15');
            if (!params.has('interval')) params.set('interval', '5000');
            if (!window.location.search) {
                history.replaceState({}, '', window.location.pathname + '?' + params.toString());
            }

            const limitInput = document.getElementById('limitInput');
            const pageInput = document.getElementById('pageInput');
            // Установить значения из query
            limitInput.value = params.get('limit') || '';
            pageInput.value = params.get('page') || '';

            function updateParam(name, value) {
                if (value && !Object.is(Number(value), Number.NaN)) {
                    params.set(name, value);
                } else {
                    params.delete(name);
                }
                const newUrl = window.location.pathname + '?' + params.toString();
                history.replaceState({}, '', newUrl);
            }

            limitInput.addEventListener('blur', () => {
                updateParam('limit', limitInput.value.trim());
                location.reload();
            });

            pageInput.addEventListener('blur', () => {
                updateParam('page', pageInput.value.trim());
                location.reload();
            });
        </script>
        </body>
        </html>
    `
    return html
}

