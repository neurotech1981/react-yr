/*
    A weather app using data from the Norwegian Meteorological Institute API (https://api.met.no/)
    Using Google Geocode for getting the Latitude / Longitude and Google Places for automatic location suggestions while users type.
*/
import React, { Component } from 'react';
import Geocode from 'react-geocode';
import Script from 'react-load-script';
import xpath from 'xml2js-xpath';
import 'three-dots';
import geoIcon from '../../img/compass.svg';
require('dotenv').config();

Geocode.setApiKey(process.env.REACT_APP_GOOGLE_API);

function jsUcfirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const optionsGeo = {
  enableHighAccuracy: false,
  timeout: 5000,
  maximumAge: 0,
};

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

class landing extends Component {
  constructor(props) {
    super(props);

    this.searchInput = React.createRef();

    this.state = {
      currentSearch: '',
      currentLatitude: '',
      currentLongitude: '',
      currentTemp: '',
      currentMinTemp: '',
      currentMaxTemp: '',
      currenTempFahrenheit: '',
      currentWindspeed: '',
      currentWindgust: '',
      currentWindText: '',
      currentSymbolImg: '',
      currentIcon: '',
      isLoading: false,
      stedsNavn: '',
      constTemp: '',
      checked: false,
      error: null,
      dayOne: [{ day: '', temp: '', wind: '', icon: '' }],
      dayTwo: [{ day: '', temp: '', wind: '', icon: '' }],
      dayThree: [{ day: '', temp: '', wind: '', icon: '' }],
    };

    // preserve the initial state in a new object
    this.baseState = this.state;
    this.onClick = this.onClick.bind(this);
    this.onChange = this.onChange.bind(this);
    this.handleScriptLoad = this.handleScriptLoad.bind(this);
    this.handlePlaceSelect = this.handlePlaceSelect.bind(this);
  }

  componentDidMount() {
    this.searchInput.current.focus();
  }

  initializeGeoLocation = () => {
    let locationName = '';
    const self = this;
    self.setState({ isLoading: true });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          self.setState({
            currentLatitude: position.coords.latitude,
            currentLongitude: position.coords.longitude,
          });
          fetch(
            `${process.env.REACT_APP_GOOGLE_URL}${position.coords.latitude},${position.coords.longitude}&key=${process.env.REACT_APP_GOOGLE_API}`,
            {}
          )
            .then((response) => response.json())
            .then(async (response) => {
              locationName =
                response.results[0].address_components[2].long_name;
              if (!locationName) {
                self.setState({ stedsNavn: locationName });
              }
              self.checkWeather();
            });
        },
        error,
        optionsGeo
      );
    }
    self.setState({ isLoading: false });
  };

  handleCheckbox = () => {
    this.setState((prevState) => ({ checked: !prevState.checked }));
    const { checked, currenTempFahrenheit, constTemp } = this.state;
    const celsius = constTemp;
    if (checked) {
      this.setState({ currentTemp: celsius });
    } else {
      const fahrenheit = currenTempFahrenheit;
      this.setState({ currentTemp: fahrenheit });
    }
  };

  onChange = (e) => {
    this.setState({ currentSearch: e.target.value });
  };

  weatherForecast = (result, timeOfDay, daysAhead) => {
    let dateOne = new Date();
    let temperature = '';
    let symbol = '';
    let wind = '';
    // add a day to todays date
    dateOne.setDate(dateOne.getDate() + daysAhead);
    let oneDayaHead = dateOne.toLocaleDateString('no-NO', { weekday: 'long' });
    oneDayaHead = jsUcfirst(oneDayaHead);
    dateOne = dateOne.toJSON(dateOne);
    const res = dateOne.substr(0, 10);
    // change to what time of the day you want data from
    const res1 = `T${timeOfDay}:00Z`;
    const res2 = res.concat(res1);
    for (let i = 0; i < result.weatherdata.product[0].time.length; i += 1) {
      if (result.weatherdata.product[0].time[i].$.from === res2) {
        temperature = result.weatherdata.product[0].time[i].location[0].temperature[0].$.value;
        symbol = result.weatherdata.product[0].time[i + 1].location[0].symbol[0].$.number;
        wind = result.weatherdata.product[0].time[i].location[0].windSpeed[0].$.mps;
        break;
      }
    }
    const weatherSymbol = `${process.env.REACT_APP_MET_PIC_URL}${symbol}&content_type=image/svg%2Bxml`;
    return { oneDayaHead, temperature, weatherSymbol, wind };
  };

  checkWeather = () => {
    const parseString = require('react-native-xml2js').parseString;
    const self = this;
    let searchCopy = '';
    searchCopy = this.state.currentSearch;
    self.setState({ isLoading: true });
    if (searchCopy.length > 0) {
      Geocode.fromAddress(searchCopy).then(
        (response) => {
          const { lat, lng } = response.results[0].geometry.location;
          console.log(`${lat}<<lat lng>>${lng}`);
          this.setState({
            currentLatitude: lat,
            currentLongitude: lng,
            stedsNavn: searchCopy,
          });
        },
        (error) => {
          this.setState({ error, isLoading: false });
        }
      );
    }
    setTimeout(() => {
      console.log(process.env.REACT_APP_MET_API_URL);
      console.log(this.state.currentLatitude);
      fetch(
        `${process.env.REACT_APP_MET_API_URL}?lat=${this.state.currentLatitude}&lon=${this.state.currentLongitude}`,
        {}
      )
        .then((response) => response.text())
        .then(async (response) => {
          parseString(response, (err, result) => {
            // Find and set Current Temperature
            const currTemperature = xpath.evalFirst(
              result,
              '//temperature',
              'value'
            );
            // Set a constant temperature state
            self.setState({ constTemp: currTemperature });
            // convert constant temperature to a new variable and update Fahrenheit state
            const fahrenheit = self.convertToFahrenheit(self.state.constTemp);
            self.setState({ currenTempFahrenheit: fahrenheit });

            let currentTempIcon =
              currTemperature >= 10 && currTemperature <= 20
                ? '🌡️'
                : '' || currTemperature <= 10
                ? '🥶'
                : '' || currTemperature >= 20
                ? '🥵'
                : '';
            self.setState({ currentIcon: currentTempIcon });
            // Check for Celsius or Fahrenheit (checkbox = false or true) and set current temperature unit state accordingly
            if (self.state.checked) {
              self.setState({ currentTemp: self.state.currenTempFahrenheit });
            } else {
              self.setState({ currentTemp: self.state.constTemp });
            }
            // Find and set current minimum temperature
            const currMinTemp = xpath.evalFirst(result, '//minTemperature', 'value');
            self.setState({ currentMinTemp: currMinTemp });
            // Find and set current maximum temperature
            const currMaxTemp = xpath.evalFirst(result, '//maxTemperature', 'value');
            self.setState({ currentMaxTemp: currMaxTemp });
            // Find and set Current Windspeed in M/S
            const currWindspeed = xpath.evalFirst(result, '//windSpeed', 'mps');
            self.setState({ currentWindspeed: currWindspeed });
            // Find and set Windgust in M/S
            const currWindgust = xpath.evalFirst(result, '//windGust', 'mps');
            self.setState({ currentWindgust: currWindgust });
            // Find and set current Wind text
            const currWindtext = xpath.evalFirst(result, '//windSpeed', 'name');
            self.setState({ currentWindText: currWindtext });
            // Set current image for weather illustration
            const currSymbolImg = xpath.evalFirst(result, '//symbol', 'number');
            const currWImgLink = `${process.env.REACT_APP_MET_ICON_URL}${currSymbolImg}&content_type=image/svg%2Bxml`;
            self.setState({ currentSymbolImg: currWImgLink });
            const dayOne = this.weatherForecast(result, '12:00', 1);
            const dataDayOne = this.state.dayOne.map((data) => ({
              ...data,
              temp: dayOne.temperature,
              day: dayOne.oneDayaHead,
              icon: dayOne.weatherSymbol,
              wind: dayOne.wind.concat(' m/s'),
            }));
            this.setState({ dayOne: dataDayOne });

            const dayTwo = this.weatherForecast(result, '12:00', 2);
            const dataDayTwo = this.state.dayTwo.map((data) => {
              return {
                ...data,
                temp: dayTwo.temperature,
                day: dayTwo.oneDayaHead,
                icon: dayTwo.weatherSymbol,
                wind: dayTwo.wind.concat(' m/s'),
              };
            });

            this.setState({ dayTwo: dataDayTwo });
            const dayThree = this.weatherForecast(result, '12:00', 3);
            const dataDayThree = this.state.dayThree.map((data) => ({
              ...data,
              temp: dayThree.temperature,
              day: dayThree.oneDayaHead,
              icon: dayThree.weatherSymbol,
              wind: dayThree.wind.concat('m/s'),
            }));
            console.log(dataDayThree);
            this.setState({ dayThree: dataDayThree });
          });
        })
        .catch((err) => {
          console.log('fetch', err);
        });
      self.setState({ isLoading: false });
    }, 1000);
    this.setState({ currentSearch: '' });
  };

  onClick = (e) => {
    e.preventDefault();
    if (this.state.currentSearch) this.checkWeather();
  };

  convertToFahrenheit(num) {
    const toFahrenheit = Math.round(num * 1.8 + 32);
    this.setState({ currenTempFahrenheit: toFahrenheit });
    num = 0;
    return toFahrenheit;
  }

  handleScriptLoad() {
    // Declare Options For Autocomplete
    const options = { types: ['(cities)'] };
    // Initialize Google Autocomplete
    /* global google */
    this.autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('autocomplete'),
      options
    );
    // Fire Event when a suggested name is selected
    this.autocomplete.addListener('place_changed', this.handlePlaceSelect);
  }

  handlePlaceSelect() {
    // Extract City From Address Object
    const addressObject = this.autocomplete.getPlace();
    const address = addressObject.address_components;

    // Check if address is valid
    if (address) {
      // Set State
      this.setState({
        currentSearch: addressObject.formatted_address,
      });
    }
  }

  render() {
    const {
      currentWindspeed,
      currentWindgust,
      currentSymbolImg,
      currentWindText,
      currentSearch,
      currentTemp,
      currentMinTemp,
      currentMaxTemp,
      currenTempFahrenheit,
      checked,
      stedsNavn,
      isLoading,
      currentIcon
    } = this.state;

    return (
      <div className="landing landing-inner">
        <Script
          url={process.env.REACT_APP_GOOGLE_MAPS_API}
          onLoad={this.handleScriptLoad}
        />
        <div className="jumbotron">
          <div className="col-centered">
            {error ? <p>{error.message}</p> : null}
            <h1>
              Værsøk for hele verden.
              <span role="img" aria-label="emojis">
                🌡️☀️🌧️
              </span>
            </h1>
            <div className="input-group">
              <input
                id="autocomplete"
                type="search"
                className="form-control form-control-lg"
                placeholder="Søk etter sted..."
                aria-label="Søk etter sted..."
                aria-describedby="button-addon2"
                value={currentSearch}
                onChange={this.onChange}
                ref={this.searchInput}
                required
              />
              <div className="input-group-append col-xs-1">
                <button
                  className="btn btn-lg btn-primary"
                  type="button"
                  id="button-addon2"
                  onClick={this.onClick}
                >
                  <span role="img" aria-label="emojis">
                    🔍
                  </span>{' '}
                  Søk
                </button>
              </div>
              <div className="checkbox">
                <input
                  type="checkbox"
                  id="checkbox1"
                  onChange={this.handleCheckbox}
                  defaultChecked={checked}
                />
                <label htmlFor="checkbox1" />
              </div>
              <div className="geo">
                <label
                  onClick={this.initializeGeoLocation}
                  onKeyDown={this.handleClick}
                >
                  <img className="geoImg" src={geoIcon} alt="Geo Icon" />
                </label>
              </div>
            </div>
          </div>
          <br />
          <div className="lead">
            <h1 className="display-10">
              Værvarsel for: <br />
              {stedsNavn.length === 0 ? (
                <span>Ingen sted søkt opp enda</span>
              ) : (
                <span>{stedsNavn}</span>
              )}
            </h1>
          </div>
          {isLoading === true && <div className="dot-falling col-centered" />}
          <div
            className="lead"
            style={{ fontSize: '1.5em', fontWeight: '600' }}
          >
            {currentTemp.length === 0 ? (
              ''
            ) : (
              <span>
                Nåværende temperatur
                <span
                  role="img"
                  aria-label="Temperature"
                  style={{ fontSize: '1em' }}
                >
                  {currentIcon}
                </span>
                <strong>
                  {checked ? currenTempFahrenheit : currentTemp}{' '}
                  {checked ? '℉' : '℃'}
                </strong>
              </span>
            )}
          </div>
          <div className="lead">
            {currentWindspeed.length === 0 ? (
              ''
            ) : (
              <span>
                Vind i m/s {' '}
                <b>
                  {currentWindspeed}-{currentWindgust} m/s{' '}
                  <span role="img" aria-label="Wind">
                    💨
                  </span>{' '}
                  ({currentWindText})
                </b>
              </span>
            )}
          </div>
          <div className="lead" style={{ paddingBottom: '10px' }}>
            <img src={currentSymbolImg} alt="" style={{ width: '20%' }} />
          </div>
          {this.state.dayOne[0].day.length === 0 ? (
            ''
          ) : (
            <div className="flex-container">
              <div className="card-header">
                <div className="card-header-top">
                  {this.state.dayOne[0].day}
                </div>
                <img
                  src={this.state.dayOne[0].icon}
                  alt=""
                  style={{ width: '60%' }}
                />
              </div>
              <div className="card-main">
                <i className="material-icons">{this.state.dayOne[0].temp} ℃</i>
                <div className="main-description">
                  {this.state.dayOne[0].wind}
                </div>
              </div>
              <div className="card-header">
                <div className="card-header-top">
                  {this.state.dayTwo[0].day}
                </div>
                <img
                  src={this.state.dayTwo[0].icon}
                  alt=""
                  style={{ width: '60%' }}
                />
              </div>
              <div className="card-main">
                <i className="material-icons">{this.state.dayTwo[0].temp} ℃</i>
                <div className="main-description">
                  {this.state.dayTwo[0].wind}
                </div>
              </div>
              <div className="card-header">
                <div className="card-header-top">
                  {this.state.dayThree[0].day}
                </div>
                <img
                  src={this.state.dayThree[0].icon}
                  alt=""
                  style={{ width: '60%' }}
                />
              </div>
              <div className="card-main">
                <i className="material-icons">
                  {this.state.dayThree[0].temp} ℃
                </i>
                <div className="main-description">
                  {this.state.dayThree[0].wind}
                </div>
              </div>
            </div>
          )}
        </div>
        <p>
          <a
            rel="noopener noreferrer"
            target="_blank"
            alt=""
            href="https://www.met.no/en/"
          >
            <code style={{ color: '#000000' }}>
              Based on data from The Norwegian Meteorological Institute
            </code>
          </a>
        </p>
      </div>
    );
  }
}

export default landing;
