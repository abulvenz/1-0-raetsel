import m from 'mithril';
import tagl from 'tagl-mithril';
import games from './games';

console.log(games)

const { h1, div, small, button, p, pre } = tagl(m);

const FieldSize = 10;

const range = (S, N) => {
    const r = [];
    for (let i = S; i < N; i++) r.push(i);
    return r;
}

const flatMap = (arr, fn = e => e) => arr.reduce((acc, e) => acc.concat(fn(e)), []);

const use = (v, fn) => fn(v);

const indicies = (arr, predicate) => arr.map((e, idx) => predicate(e) ? idx : undefined).filter(e => e !== undefined)

const fieldStates = Object.freeze({
    empty_: { text: '', value: -1 },
    init_0: { text: '0', value: 0 },
    init_1: { text: '1', value: 1 },
    game_0: { text: '0', value: 0 },
    game_1: { text: '1', value: 1 },
});

const initialStateSet = [
    fieldStates.empty_,
    fieldStates.init_0,
    fieldStates.init_1,
];

const gameStateSet = [
    fieldStates.empty_,
    fieldStates.game_0,
    fieldStates.game_1,
];

const next = (state, stateSet) => stateSet[(stateSet.indexOf(state) + 1) % stateSet.length];

const numbersByValue = values => values.reduce((acc, v) => { acc[v] = acc[v] ? acc[v] + 1 : 1; return acc; }, {});

const limitInMapValid = (numbersByValue_, limit) =>
    Object.keys(numbersByValue_).filter(key => key >= 0).every(key => numbersByValue_[key] <= limit)

const sumRuleValid = values => use(
    numbersByValue(values),
    numbersByValue => limitInMapValid(numbersByValue, FieldSize / 2)
);

const duoRuleValid = values => range(0, values.length - 3).map(start =>
    use(
        numbersByValue(range(0, 3).map(idx => values[start + idx])),
        numbersByValue_ => limitInMapValid(numbersByValue_, 2)
    )
).every(e => e)

const rowIndices = rowIdx => range(rowIdx * FieldSize, (rowIdx + 1) * FieldSize);
const columnIndices = colIdx => range(0, FieldSize).map(idx => idx * FieldSize + colIdx);

const rowTraversal = (rowIdx, withRow) => use(rowIndices(rowIdx).map(idx => field[idx].value.value), fields => withRow(fields));
const columnTraversal = (colIdx, withCol) => use(columnIndices(colIdx).map(idx => field[idx].value.value), fields => withCol(fields));

const rowRuleValid = rowIdx => rowTraversal(rowIdx, fields => sumRuleValid(fields) && duoRuleValid(fields));
const colRuleValid = colIdx => columnTraversal(colIdx, fields => sumRuleValid(fields) && duoRuleValid(fields));

const clear = () => flatMap(range(0, FieldSize)
    .map(row => range(0, FieldSize).map(column => { return { row, column, value: fieldStates.empty_ }; })));

let field = clear();



const loadOldGame = oGame => {
    field = clear();
    const findInitialObject = value =>
        initialStateSet.find(init => init.value === value)
    oGame.forEach((value, idx) => {
        field[idx].value = findInitialObject(value);
    })
};

use(localStorage.getItem('game'), oldGame => {
    if (oldGame != null) {
        try {
            const oGame = JSON.parse(oldGame);
            console.log(oGame)
            loadOldGame(oGame);
        } catch (error) {
            console.error(error)
            localStorage.setItem('game', null);
        }
    }
});


const gameState = Object.freeze({
    setup: 'Fill in your numbers and hit "Start"!',
    play: '',
    won: 'You have won.'
});

const appState = {
    state: gameState.setup,
};

const evaluateRows = () => range(0, FieldSize).every(rowRuleValid);
const evaluateColumns = () => range(0, FieldSize).every(colRuleValid);

const isFilled = () => field.every(f => f.value !== fieldStates.empty_);

const isWon = () => evaluateRows() && evaluateColumns() && isFilled();

const whenState = (state, cb) => appState.state === state ? cb() : null;

const patterns = [{
    precondition: [
        fieldStates.game_0,
        fieldStates.game_0,
        fieldStates.empty_
    ],
    postcondition: [
        fieldStates.game_0,
        fieldStates.game_0,
        fieldStates.game_1
    ]
}, {
    precondition: [
        fieldStates.game_0,
        fieldStates.empty_,
        fieldStates.game_0
    ],
    postcondition: [
        fieldStates.game_0,
        fieldStates.game_1,
        fieldStates.game_0
    ]
}];

patterns.forEach(pattern => {
    const mirror = arr => arr.map(field => field === fieldStates.game_0 ? fieldStates.game_1 : field === fieldStates.game_1 ? fieldStates.game_0 : fieldStates.empty_);
    patterns.push({ precondition: mirror(pattern.precondition), postcondition: mirror(pattern.postcondition) })
});

const up = (current, n) => field.find(f => f.row === current.row - n && f.column === current.column);
const left = (current, n) => field.find(f => f.column === current.column - n && f.row === current.row);
const down = (current, n) => field.find(f => f.row === current.row + n && f.column === current.column);
const right = (current, n) => field.find(f => f.column === current.column + n && f.row === current.row);

const traverse3neighbors = withNeighbors =>
    field.map(f => {
        let changed = false;
        if (f.row < FieldSize - 2) {
            const neighbors = [f, down(f, 1), down(f, 2)];
            changed = withNeighbors(neighbors) || changed;
        }
        if (f.column < FieldSize - 2) {
            const neighbors = [f, right(f, 1), right(f, 2)];
            changed = withNeighbors(neighbors) || changed;
        }
        if (f.row > 1) {
            const neighbors = [f, up(f, 1), up(f, 2)];
            changed = withNeighbors(neighbors) || changed;
        }
        if (f.column > 1) {
            const neighbors = [f, left(f, 1), left(f, 2)];
            changed = withNeighbors(neighbors) || changed;
        }
        return changed;
    }).some(e => e);


const match = (neighbors, pattern) =>
    neighbors.every((neighbor, idx) => neighbor.value.value === pattern.precondition[idx].value);

const patch = (neighbors, pattern) => neighbors.forEach((neighbor, idx) =>
    neighbor.value.value !== pattern.postcondition[idx].value ?
    neighbor.value = pattern.postcondition[idx].value === fieldStates.game_0.value ?
    fieldStates.game_0 : fieldStates.game_1 : null);

const patchRowBySum = rowIdx => rowTraversal(rowIdx, row => use(numbersByValue(row), numbersByValue =>
    (numbersByValue[fieldStates.empty_.value] > 0 && (
        numbersByValue[fieldStates.game_0.value] == FieldSize / 2 ||
        numbersByValue[fieldStates.game_1.value] == FieldSize / 2
    )) ?
    indicies(row, v => v === fieldStates.empty_.value)
    .every(columnIdx =>
        field.find(f => f.column === columnIdx && f.row === rowIdx).value = (numbersByValue[fieldStates.game_0.value] > numbersByValue[fieldStates.game_1.value]) ?
        fieldStates.game_1 : fieldStates.game_0
    ) : false
));

const patchColumnBySum = columnIdx => columnTraversal(columnIdx, column => use(numbersByValue(column), numbersByValue =>
    (numbersByValue[fieldStates.empty_.value] > 0 && (
        numbersByValue[fieldStates.game_0.value] == FieldSize / 2 ||
        numbersByValue[fieldStates.game_1.value] == FieldSize / 2
    )) ?
    indicies(column, v => v === fieldStates.empty_.value)
    .forEach(rowIdx =>
        field.find(f => f.column === columnIdx && f.row === rowIdx).value = (numbersByValue[fieldStates.game_0.value] > numbersByValue[fieldStates.game_1.value]) ?
        fieldStates.game_1 : fieldStates.game_0
    ) : false
));

const patchRowsBySum = () => range(0, FieldSize).map(patchRowBySum).some(e => e);
const patchColumnsBySum = () => range(0, FieldSize).map(patchColumnBySum).some(e => e);

const advance = () => {
    let start = true;
    do {
        start = false;
        start =
            traverse3neighbors(neighbors =>
                neighbors.map(neighbor =>
                    neighbors.some(neighbor => neighbor.value.value !== fieldStates.empty_.value) ?
                    patterns.map(pattern => {
                        if (match(neighbors, pattern)) {
                            patch(neighbors, pattern);
                            return true;
                        }
                        return false;
                    }).some(e => e) : false
                ).some(e => e)
            ) || start;
        start = patchRowsBySum() || start;
        start = patchColumnsBySum() || start;
        m.redraw()
    } while (start);
};

m.mount(document.body, {
    view: vnode => [
        div.banner(
            h1('Binero'),
            p(
                small(appState.state),
            ),
            whenState(gameState.setup,
                () => button({
                    onclick: () => {
                        appState.state = gameState.play;
                        localStorage.setItem('game', JSON.stringify(field.map(f => f.value.value)))
                    }
                }, "Start")),
            whenState(gameState.setup,
                () => button({
                    onclick: () => {
                        field = clear();
                    }
                }, "Clear")),
            whenState(gameState.setup,
                () => button({
                        onclick: () => {
                            loadOldGame(games[
                                use(Object.keys(games), a => a[Math.floor(Math.random() * a.length)])
                            ])
                        },
                    },
                    "Random")),
            whenState(gameState.play,
                () => button({
                    onclick: () => advance()
                }, "Solve"))
        ),
        div.wrapper(
            div.board(
                field.map((f, idx) => [
                    whenState(gameState.setup, () => div.box.unselectable[`child${('0000'+idx).substr(-4,4)}`]({
                        onclick: () => f.value = next(f.value, initialStateSet)
                    }, f.value.text)),
                    whenState(gameState.play, () =>
                        f.value === fieldStates.init_0 || f.value === fieldStates.init_1 ?
                        div.box.unselectable.disabled[`child${('0000'+idx).substr(-4,4)}`](f.value.text) :
                        div.box.unselectable[`child${('0000'+idx).substr(-4,4)}`]({
                            onclick: () => f.value = next(f.value, gameStateSet)
                        }, f.value.text))
                ]),
            )
        ), [
            div(evaluateRows() ? '' : 'invalid rows'),
            div(evaluateColumns() ? '' : 'invalid columns'),
            div(isWon() ? 'won' : 'not yet won')
        ],
        //  pre(JSON.stringify(field.map(f => f.value.value), null, 2))
    ]
});