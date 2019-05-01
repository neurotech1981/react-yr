import React, { Component } from 'react';
import './App.css';
import Landing from './components/layout/landing';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <Landing />
        </header>
      </div>
    );
  }
}

export default App;
