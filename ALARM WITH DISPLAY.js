const SerialPort = require("serialport");
const { Board, Button, Led, Motion, Piezo } = require("johnny-five");

const board = new Board({
  port: await SerialPort.list({
    filters: [{ vendorId: 0x2341, productId: 0x0001 }],
  })[0].path,
});

board.on("ready", () => {
  const buzzer = new Piezo(2);
  const pirSensor = new Motion(3);
  const button1 = new Button(4);
  const button2 = new Button(5);
  const button3 = new Button(6);
  const button4 = new Button(7);
  const led1 = new Led(8);
  const led2 = new Led(9);
  const led3 = new Led(10);

  const displayPins = [11, 12, 13, 14, 15, 16, 17]; // Pins connected to the single digit display segments

  let snoozeCount = 0;
  let alarmHours = 0;
  let alarmSet = false;
  let alarmActive = false;
  let alarmStartTime = 0;
  let temperatureLog = new Array(24);
  let temperatureLogIndex = 0;
  let remainingHours = 0;

  function playAlarm() {
    buzzer.frequency(440, 2000); // beeeeep! sound for 2 seconds
  }

  function stopAlarm() {
    buzzer.noTone();
    alarmActive = false;
  }

  function detectMotion() {
    // Implement motion detection logic here
  }

  function logTemperature(temperature) {
    temperatureLog[temperatureLogIndex] = temperature;
    temperatureLogIndex = (temperatureLogIndex + 1) % 24;
  }

  function handleButtonPress(buttonPin) {
    if (!alarmSet) {
      if (buttonPin === button1.pin) {
        alarmHours++;
      } else if (buttonPin === button2.pin) {
        if (alarmHours > 0) {
          alarmHours--;
        }
      } else if (buttonPin === button3.pin) {
        alarmSet = true;
        alarmActive = false; // Reset alarm activation status
        led3.off(); // Turn off the alarm LED
        alarmStartTime = Date.now();
      }
    } else {
      if (buttonPin === button3.pin) {
        alarmSet = false;
        stopAlarm();
      }
    }
  }

  function updateLEDs() {
    if (alarmSet) {
      led1.on();
      led2.off();
    } else {
      led1.off();
      led2.on();
    }
  }

  function updateDisplay(hours) {
    const segments = [
      // Define the segments for each digit from 0 to 9
      [1, 1, 1, 1, 1, 1, 0], // 0
      [0, 1, 1, 0, 0, 0, 0], // 1
      [1, 1, 0, 1, 1, 0, 1], // 2
      [1, 1, 1, 1, 0, 0, 1], // 3
      [0, 1, 1, 0, 0, 1, 1], // 4
      [1, 0, 1, 1, 0, 1, 1], // 5
      [1, 0, 1, 1, 1, 1, 1], // 6
      [1, 1, 1, 0, 0, 0, 0], // 7
      [1, 1, 1, 1, 1, 1, 1], // 8
      [1, 1, 1, 1, 0, 1, 1]  // 9
    ];

    // Turn off all display pins
    displayPins.forEach(pin => {
      board.digitalWrite(pin, 0);
    });

    // Extract segments for the corresponding digit
    const digitSegments = segments[hours % 10];

    // Enable segments for the digit
    digitSegments.forEach((segment, index) => {
      if (segment === 1) {
        board.digitalWrite(displayPins[index], 1);
      }
    });
  }

  // Set up display pins as OUTPUT
  displayPins.forEach(pin => {
    board.pinMode(pin, board.MODES.OUTPUT);
  });

  board.loop(1000, () => {
    const lightValue = readLightSensor(); // Implement light sensor reading

    // Check if it's time to trigger the alarm based on the light level
    if (!alarmSet && lightValue > THRESHOLD_LIGHT_LEVEL) {
      if (detectMotion()) {
        snoozeCount++;
        setTimeout(() => {
          stopAlarm();
        }, 5000); // Snooze time (5 seconds)
      }
    }

    // Check if the alarm should go off
    if (alarmSet && !alarmActive && (Date.now() - alarmStartTime) >= alarmHours * 3600000) {
      alarmActive = true;
      playAlarm();
    }

    const temperature = readTemperature(); // Implement temperature reading
    logTemperature(temperature);

    // Handle button presses
    button1.on("press", () => {
      handleButtonPress(button1.pin);
    });
    button2.on("press", () => {
      handleButtonPress(button2.pin);
    });
    button3.on("press", () => {
      handleButtonPress(button3.pin);
    });

    // Update LED status
    updateLEDs();

    // Calculate remaining hours
    remainingHours = Math.max(alarmHours - Math.floor((Date.now() - alarmStartTime) / 3600000), 0);
    updateDisplay(remainingHours);
  });
});
