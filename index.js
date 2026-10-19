// Простой консольный калькулятор на Node.js
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function start() {
  rl.question('Введите первое число: ', (input1) => {
    const a = Number(input1);
    if (isNaN(a)) {
      console.log('Это не число, попробуйте снова.');
      return start();
    }

    rl.question('Введите второе число: ', (input2) => {
      const b = Number(input2);
      if (isNaN(b)) {
        console.log('Это не число, попробуйте снова.');
        return start();
      }

      rl.question('Выберите операцию (+, -, *, /, ^): ', (op) => {
        let result;

        if (op === '+') {
          result = a + b;
        } else if (op === '-') {
          result = a - b;
        } else if (op === '*') {
          result = a * b;
        } else if (op === '/') {
          if (b === 0) {
            console.log('На ноль делить нельзя!');
            return start();
          }
          result = a / b;
        } else if (op === '^') {
          result = Math.pow(a, b);
        } else {
          console.log('Такой операции нет.');
          return start();
        }

        console.log('Ответ: ' + result);

        rl.question('Посчитать ещё раз? (да/нет): ', (answer) => {
          if (answer.toLowerCase() === 'да') {
            start();
          } else {
            rl.close();
          }
        });
      });
    });
  });
}

start();

