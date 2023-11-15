'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const errorContainer = document.querySelector('.error-container');

class Workout {
  constructor(coords, distance, duration) {
    this.id = Date.now().toString().slice(-10);
    this.date = new Date();
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  _calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._calcSpeed();
    this._setDescription();
  }

  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Application Architecture
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getLocalStorage();
    this._getPosition();
    form.addEventListener('submit', e => this._newWorkout(e));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', e => this._moveToPopup(e));
  }

  _getLocalStorage() {
    const localData = JSON.parse(localStorage.getItem('workouts'));

    if (!localData) return;

    this.#workouts = localData.reduce((acc, data) => {
      let obj;

      if (data.type === 'running') obj = new Running();
      if (data.type === 'cycling') obj = new Cycling();

      Object.assign(obj, data);

      acc.push(obj);

      return acc;
    }, []);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        this.showError('Unable to access user location.')
      );
    }
  }

  _newWorkout(e) {
    // Helpers
    const validateInput = (...values) =>
      values.every(value => Number.isFinite(value));
    const allPositive = (...values) => values.every(value => value > 0);

    e.preventDefault();

    let workout;
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      if (
        !validateInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return this.showError('Inputs must be positive numbers!');
      }

      workout = new Running(coords, distance, duration, cadence);
      this.#workouts.push(workout);
    }

    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      if (
        !validateInput(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return this.showError('Inputs must be positive numbers!');
      }

      workout = new Cycling(coords, distance, duration, elevation);
      this.#workouts.push(workout);
    }

    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 200,
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🚴‍♀️' : '🏃‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 15);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map).bindPopup('You are here').openPopup();

    if (this.#workouts.length > 0) {
      this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
      this.#workouts.forEach(workout => this._renderWorkout(workout));
    }

    this.#map.on('click', e => {
      this.#mapEvent = e;
      this._showForm();
    });
  }

  _showForm() {
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _moveToPopup(e) {
    if (!e.target.closest('.workout')) return;

    const workoutID = e.target.closest('.workout').dataset.id;
    const workoutCoords = this.#workouts.find(
      workout => workout.id === workoutID
    ).coords;
    this.#map.setView(workoutCoords, 15, {
      animate: true,
      duration: 1,
    });
  }

  showError(errorMEssage) {
    const html = `
      <div class="error">
        <p> ⚠️ ${errorMEssage}</p>
      </div>`;

    errorContainer.insertAdjacentHTML('afterbegin', html);
    const error = errorContainer.querySelector('.error');
    setTimeout(() => {
      errorContainer.removeChild(error);
    }, 2500);
  }
}

const app = new App();
