import m from 'mithril';
import tagl from 'tagl-mithril';

const { h1, div, small, button, p } = tagl(m);

const FieldSize = 10;

const range = (S, N) => {
    const r = [];
    for (let i = S; i < N; i++) r.push(i);
    return r;
}

const flatMap = (arr, fn = e => e) => arr.reduce((acc, e) => acc.concat(fn(e)), []);

const use = (v, fn) => fn(v);

const fieldStates = Object.freeze({
    empty: {
        text: '',
        value: -1
    },
    initial_0: {
        text: '0',
        value: 0,
    },
    initial_1: {
        text: '1',
        value: 1,
    },
    game_0: {
        text: '0',
        value: 0
    },
    game_1: {
        text: '1',
        value: 1
    },
});

const initialStateSet = [
    fieldStates.empty,
    fieldStates.initial_0,
    fieldStates.initial_1,
];

const gameStateSet = [
    fieldStates.empty,
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

const rowRuleValid = rowIdx => use(range(rowIdx * FieldSize, (rowIdx + 1) * FieldSize).map(idx => field[idx].value.value), fields => sumRuleValid(fields) && duoRuleValid(fields));
const colRuleValid = colIdx => use(range(0, FieldSize).map(idx => idx * FieldSize + colIdx).map(idx => field[idx].value.value), fields => sumRuleValid(fields) && duoRuleValid(fields));

const field = flatMap(range(0, FieldSize)
    .map(row => range(0, FieldSize).map(column => { return { row, column, value: fieldStates.empty }; })));

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

const isFilled = () => field.every(f => f.value !== fieldStates.empty);

const isWon = () => evaluateRows() && evaluateColumns() && isFilled();

const whenState = (state, cb) => appState.state === state ? cb() : null;

const patterns = [{
    precondition: ['a', 'a', ' '],
    postcondition: ['a', 'a', 'b']
}, {
    precondition: ['a', 'a', ' '],
    postcondition: ['a', 'a', 'b']
}];

const advance = () => {

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
                    onclick: () => appState.state = gameState.play
                }, "Start")),
            whenState(gameState.play,
                () => button({
                    onclick: () => advance()
                }, "Solve"))
        ),
        div.board(
            field.map(f => [
                whenState(gameState.setup, () => div.box.unselectable({
                    onclick: () => f.value = next(f.value, initialStateSet)
                }, f.value.text)),
                whenState(gameState.play, () =>
                    f.value === fieldStates.initial_0 || f.value === fieldStates.initial_1 ?
                    div.box.unselectable.disabled(f.value.text) :
                    div.box.unselectable({
                        onclick: () => f.value = next(f.value, gameStateSet)
                    }, f.value.text))
            ]),
        ), [
            div(evaluateRows() ? '' : 'invalid rows'),
            div(evaluateColumns() ? '' : 'invalid columns'),
            div(isWon() ? 'won' : 'not yet won')
        ]
    ]
});