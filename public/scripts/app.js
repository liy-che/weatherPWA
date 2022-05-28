(function() {
  'use strict';

  let weatherAPIUrlBase = 'https://api.openweathermap.org/data/2.5/';

  // fine with showing free tier api key for personal project
  // can set up proxy server to hide if needed
  let APIKey = '';

  let app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  /* Event listener for refresh button */
  document.getElementById('butRefresh').addEventListener('click', function() {
    app.updateForecasts();
  });

  /* Event listener for add new city button */
  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  /* Event listener for add city button in add city dialog */
  document.getElementById('butAddCity').addEventListener('click', function() {
    let select = document.getElementById('selectCityToAdd');
    let selected = select.options[select.selectedIndex];
    let key = selected.value;
    let label = selected.textContent;
    app.getForecast(key, label);
    app.selectedCities.push({key: key, label: label});
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  /* Event listener for cancel button in add city dialog */
  document.getElementById('butAddCancel').addEventListener('click', function() {
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {
    let card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }
    // Verify data is newer than what we already have, if not, bail
    let dataElem = card.querySelector('.date');
    if (dataElem.getAttribute('data-dt') >= data.current.dt) {
      return;
    }
    dataElem.setAttribute('data-dt', data.current.dt);
    dataElem.textContent = new Date(data.current.dt * 1000);
    card.querySelector('.description').textContent = uppercaseFirst(data.current.weather[0].description);
    card.querySelector('.current .icon').classList.add('a' + data.current.weather[0].icon);
    card.querySelector('.current .temperature .value').textContent =
      Math.round(data.current.temp);
    card.querySelector('.current .feels-like .value').textContent =
      Math.round(data.current.feels_like);
    card.querySelector('.current .precip').textContent =
      Math.round(data.hourly[0].pop * 100) + '%';
    card.querySelector('.current .humidity').textContent =
      Math.round(data.current.humidity) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(data.current.wind_speed);
    card.querySelector('.current .wind .direction').textContent =
      data.current.wind_deg;
    let nextDays = card.querySelectorAll('.future .oneday');
    let today = new Date();
    today = today.getDay();
    for (let i = 0; i < 7; i++) {
      let nextDay = nextDays[i];
      let daily = data.daily[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add('a' + daily.weather[0].icon);
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.temp.max);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.temp.min);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  // Gets a forecast for a specific city and update the card with the data
  app.getForecast = function(key, label) {
    let url = weatherAPIUrlBase + 'weather?q=' + key + '&appid=' + APIKey;
    if ("caches" in window) {
      caches.match(url).then(function(response) {
        if (response) {
          response.json().then(function(json) {
            // Only update if network is still pending, otherwise the network
            // has already returned and provided the latest data.
            if (app.hasCoordRequestPending) {
              console.log("Coords updated from cache");
              url = weatherAPIUrlBase + 'onecall?lat=' + json.coord.lat + '&lon=' + json.coord.lon + '&units=imperial' + '&appid=' + APIKey;
              caches.match(url).then(function(response) {
                if (response) {
                  response.json().then(function(json) {
                    if (app.hasDataRequestPending) {
                      console.log("Data updated from cache");
                      json.key = key;
                      json.label = label;
                      app.updateForecastCard(json);
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    // Fetch to get data, then update the card
    app.hasCoordRequestPending = true;
    app.hasDataRequestPending = true;
    fetch(url)
    .then(
      function(response) { 
        return response.json();
    })
    .then(
      function(data) {
        app.hasCoordRequestPending = false;
        url = weatherAPIUrlBase + 'onecall?lat=' + data.coord.lat + '&lon=' + data.coord.lon + '&units=imperial' + '&appid=' + APIKey;
        return fetch(url);
    })
    .then(
      function(response) {
        return response.json();
    })
    .then(
      function(data) {
        data.key = key;
        data.label = label;
        app.hasDataRequestPending = false;
        app.updateForecastCard(data);
    })
    .catch(function (err) { console.log(err); });
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    let keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

  // Saves user selected cities to localforage
  app.saveSelectedCities = function() {
    localforage.setItem("selectedCities", app.selectedCities);
  };

  /*****************************************************************************
   *
   * Helper Methods
   *
   ****************************************************************************/
  // Capitalizes the first letter of a string
  function uppercaseFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Loads previous user selections stored in localforage
  document.addEventListener('DOMContentLoaded', function() {
    localforage.getItem("selectedCities")
    .then(
      function(selectedCities) {
        if (selectedCities) {
          app.selectedCities = selectedCities;
          app.selectedCities.forEach(function(city) {
            app.getForecast(city.key, city.label);
          });
        } else {
          // todo: get most up to date info of user local 
          let defaultKey = 'new+york';
          let defaultLabel = 'New York, NY';
          app.selectedCities = [{"key": defaultKey, "label": defaultLabel}];
          app.saveSelectedCities();
          app.getForecast(defaultKey, defaultLabel);
        }
    })
    .catch(function(err) { console.log(err); });
  });

  // Registers service work if supported by browser
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js")
    .then(
      function(registration) {
        console.log("Service worker registered", registration);
    });
  }
  
})();