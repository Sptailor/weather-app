document
  .getElementById("weather-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    const city = document.getElementById("city").value;
    fetchWeather(city);
  });

async function fetchWeather(city) {
  document.getElementById("loader").style.display = "block";
  document.getElementById("weather-result").innerHTML = "";
  try {
    const response = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}?unitGroup=us&key=H8Q3TMEPZZGYLERHCZLH5SMNF&contentType=json`
    );
    if (!response.ok) {
      throw new Error("City not found");
    }
    const data = await response.json();
    displayWeather(data);
  } catch (error) {
    document.getElementById("weather-result").innerHTML = `<p>Error: ${error.message}</p>`;
  } finally {
    document.getElementById("loader").style.display = "none";
  }
}


async function getIcon(icon) {
  try {
    const iconUrl = `https://raw.githubusercontent.com/visualcrossing/WeatherIcons/main/PNG/2nd%20Set%20-%20Color/${icon}.png`;
    const response = await fetch(iconUrl);
    if (!response.ok) {
      throw new Error("Icon not found");
    }
    return iconUrl;
  } catch (error) {
    console.error("Error fetching icon:", error);
    return null;
  }
}

async function displayWeather(data) {
  console.log("Weather API data:", data);

  const weatherResult = document.getElementById("weather-result");
  const iconUrl = await getIcon(data.currentConditions.icon);

  // Find the current hour index in day[0].hours
  const now = new Date();
  const currentHour = now.getHours();
  const todayHours = data.days[0].hours;

  // Find the index of the hour closest to now
  let startIndex = todayHours.findIndex((hour) => {
    // hour.datetime is "HH:mm:ss"
    const hourNum = parseInt(hour.datetime.slice(0, 2), 10);
    return hourNum >= currentHour;
  });
  if (startIndex === -1) startIndex = 0; // fallback if not found

  // Get next 6 hours from current hour
  const hourly = todayHours.slice(startIndex, startIndex + 6);

  const hourlyItems = await Promise.all(
    hourly.map(async (hour) => {
      const hourIconUrl = await getIcon(hour.icon);
      const time = hour.datetime ? hour.datetime.slice(0, 5) : "";
      return `
        <div class="hourly-item">
          <div>${time}</div>
          <img src="${hourIconUrl}" alt="Icon" class="forecast-icon">
          <div>${Math.round(hour.temp)}°F</div>
        </div>
      `;
    })
  );

  // Only next 5 days
  const forecastItems = await Promise.all(
    data.days.slice(0, 5).map(async (day) => {
      const dayIconUrl = await getIcon(day.icon);
      const date = new Date(day.datetime);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      return `
        <li class="forecast-item">
          <img src="${dayIconUrl}" alt="Icon" class="forecast-icon">
          <div class="forecast-info">
            <strong>${dayName}</strong>
            <div class="forecast-date">${dateStr}</div>
          </div>
          <span class="forecast-temp">${Math.round(day.tempmax)}°F / ${Math.round(day.tempmin)}°F</span>
          <span class="forecast-conditions">${day.conditions}</span>
        </li>
      `;
    })
  );

  // More relevant current conditions
  const cc = data.currentConditions;

  // Helper to extract key info from alert description (first sentence or up to 120 chars)
  function getShortDescription(desc) {
    if (!desc) return "";
    const firstPeriod = desc.indexOf(".");
    if (firstPeriod > 0) return desc.slice(0, firstPeriod + 1);
    return desc.length > 120 ? desc.slice(0, 117) + "..." : desc;
  }

  // Capitalize location name
  const locationName = data.address.split(',').map(part => 
    part.trim().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  ).join(', ');

  weatherResult.innerHTML = `
    <h2>Weather in ${locationName}</h2>
    <p><strong>Temperature:</strong> ${Math.round(cc.feelslike)}°F</p>
    <p><strong>Condition:</strong> ${cc.conditions}</p>
    <img src="${iconUrl}" alt="Weather icon">
    <div class="current-details">
      <p><strong>Humidity</strong>${cc.humidity}%</p>
      <p><strong>Wind Speed</strong>${Math.round(cc.windspeed)} mph</p>
      <p><strong>Pressure</strong>${cc.pressure} mb</p>
      <p><strong>UV Index</strong>${cc.uvindex ?? "N/A"}</p>
      <p><strong>Visibility</strong>${cc.visibility ?? "N/A"} mi</p>
      <p><strong>Cloud Cover</strong>${cc.cloudcover ?? "N/A"}%</p>
    </div>
    <button id="toggle-alerts" class="toggle-alerts">
      ${
        data.alerts.length > 0
          ? `Alerts: ${data.alerts.map(a => a.event).join(", ")}`
          : "No Alerts"
      }
    </button>
    <div id="alerts" class="alerts">
      ${
        data.alerts.length > 0
          ? data.alerts
              .map(
                alert => `
        <div class="alert-item">
          ${alert.event}: ${getShortDescription(alert.description)}
          <br>
          ${alert.link ? `<br><a href="${alert.link}" target="_blank" rel="noopener" class="alert-link">More info</a>` : ""}
        </div>
      `
              )
              .join("")
          : "<p>No alerts</p>"
      }
    </div>
    <div class="hourly-row">
      ${hourlyItems.join("")}
    </div>
    <div class="forecast">
      <h3>Forecast</h3>
      <ul>
        ${forecastItems.join("")}
      </ul>
    </div>
  `;

  const toggleBtn = document.getElementById("toggle-alerts");
  const alertsDiv = document.getElementById("alerts");
  if (toggleBtn && alertsDiv) {
    toggleBtn.onclick = function() {
      alertsDiv.classList.toggle("active");
    };
  }

  // Add weather effects based on current conditions
  addWeatherEffects(data.currentConditions);
  
  // Change background based on weather
  updateBackgroundForWeather(data.currentConditions);
}

function addWeatherEffects(currentConditions) {
  // Remove any existing weather effects
  const existingEffects = document.querySelector('.weather-effects');
  if (existingEffects) {
    existingEffects.remove();
  }

  const effectsContainer = document.createElement('div');
  effectsContainer.className = 'weather-effects';
  document.body.appendChild(effectsContainer);

  const condition = currentConditions.conditions.toLowerCase();
  const icon = currentConditions.icon.toLowerCase();

  // Determine weather effects based on conditions and icon
  if (condition.includes('rain') || condition.includes('drizzle') || icon.includes('rain')) {
    addRainEffect(effectsContainer);
    if (condition.includes('thunder') || condition.includes('storm') || icon.includes('thunder')) {
      addLightningEffect(effectsContainer);
    }
  } else if (condition.includes('snow') || icon.includes('snow')) {
    addSnowEffect(effectsContainer);
  } else if (condition.includes('fog') || condition.includes('mist') || icon.includes('fog')) {
    addFogEffect(effectsContainer);
  } else if (condition.includes('cloud') || icon.includes('cloud')) {
    addCloudsEffect(effectsContainer);
    if (currentConditions.windspeed > 15) {
      addWindEffect(effectsContainer);
    }
  } else if (condition.includes('clear') || condition.includes('sunny') || icon.includes('clear') || icon.includes('sun')) {
    addSunEffect(effectsContainer);
    if (currentConditions.windspeed > 10) {
      addWindEffect(effectsContainer);
    }
  } else if (currentConditions.windspeed > 20) {
    addWindEffect(effectsContainer);
    addCloudsEffect(effectsContainer);
  }
}

function addRainEffect(container) {
  const rainDiv = document.createElement('div');
  rainDiv.className = 'rain-effect';
  
  // Create multiple rain layers for depth
  for (let layer = 0; layer < 3; layer++) {
    const rainLayer = document.createElement('div');
    rainLayer.className = 'rain-layer';
    
    // Create individual rain drops
    const dropCount = layer === 0 ? 100 : layer === 1 ? 60 : 30;
    for (let i = 0; i < dropCount; i++) {
      const drop = document.createElement('div');
      drop.className = `rain-drop ${layer === 0 ? 'heavy' : layer === 1 ? '' : 'light'}`;
      
      // Random positioning and timing
      drop.style.left = Math.random() * 100 + '%';
      drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
      drop.style.animationDelay = Math.random() * 2 + 's';
      
      rainLayer.appendChild(drop);
      
      // Add splash effect at bottom occasionally
      if (Math.random() < 0.3) {
        setTimeout(() => {
          createSplash(container, drop.style.left);
        }, (parseFloat(drop.style.animationDelay) + parseFloat(drop.style.animationDuration)) * 1000);
      }
    }
    
    rainDiv.appendChild(rainLayer);
  }
  
  // Add puddles effect
  const puddlesDiv = document.createElement('div');
  puddlesDiv.className = 'rain-puddles';
  rainDiv.appendChild(puddlesDiv);
  
  container.appendChild(rainDiv);
}

function createSplash(container, leftPosition) {
  const splash = document.createElement('div');
  splash.className = 'rain-splash';
  splash.style.left = leftPosition;
  splash.style.bottom = '10px';
  container.appendChild(splash);
  
  // Remove splash after animation
  setTimeout(() => {
    if (splash.parentNode) {
      splash.parentNode.removeChild(splash);
    }
  }, 600);
}

function addSnowEffect(container) {
  const snowDiv = document.createElement('div');
  snowDiv.className = 'snow-effect';
  
  const snowflakeTypes = ['❄', '❅', '❆', '✦', '✧', '•'];
  
  // Create multiple snow layers for depth
  for (let layer = 0; layer < 4; layer++) {
    const snowLayer = document.createElement('div');
    snowLayer.className = 'snow-layer';
    
    let flakeCount, sizeTypes;
    switch(layer) {
      case 0: // Large snowflakes
        flakeCount = 15;
        sizeTypes = ['large'];
        break;
      case 1: // Medium snowflakes
        flakeCount = 25;
        sizeTypes = ['medium'];
        break;
      case 2: // Small snowflakes
        flakeCount = 35;
        sizeTypes = ['small'];
        break;
      case 3: // Flurries
        flakeCount = 45;
        sizeTypes = ['flurry'];
        break;
    }
    
    for (let i = 0; i < flakeCount; i++) {
      const snowflake = document.createElement('div');
      const size = sizeTypes[0];
      
      snowflake.className = `snowflake ${size}`;
      snowflake.innerHTML = snowflakeTypes[Math.floor(Math.random() * snowflakeTypes.length)];
      snowflake.style.left = Math.random() * 100 + '%';
      snowflake.style.animationDelay = Math.random() * 10 + 's';
      
      snowLayer.appendChild(snowflake);
    }
    
    snowDiv.appendChild(snowLayer);
  }
  
  // Add snow accumulation
  const snowAccumulation = document.createElement('div');
  snowAccumulation.className = 'snow-accumulation';
  snowDiv.appendChild(snowAccumulation);
  
  container.appendChild(snowDiv);
}

function addLightningEffect(container) {
  // Add storm clouds background
  const stormBg = document.createElement('div');
  stormBg.className = 'storm-bg';
  container.appendChild(stormBg);
  
  // Add lightning background flash
  const lightningBgFlash = document.createElement('div');
  lightningBgFlash.className = 'lightning-bg-flash';
  container.appendChild(lightningBgFlash);
  
  const lightningDiv = document.createElement('div');
  lightningDiv.className = 'lightning-effect';
  
  // Add lightning bolts
  for (let i = 0; i < 3; i++) {
    const bolt = document.createElement('div');
    bolt.className = 'lightning-bolt';
    bolt.style.left = (20 + Math.random() * 60) + '%';
    bolt.style.top = '10%';
    bolt.style.animationDelay = (i * 1.5) + 's';
    lightningDiv.appendChild(bolt);
  }
  
  container.appendChild(lightningDiv);
}

function addFogEffect(container) {
  const fogDiv = document.createElement('div');
  fogDiv.className = 'fog-effect';
  container.appendChild(fogDiv);
}

function addCloudsEffect(container) {
  const cloudsDiv = document.createElement('div');
  cloudsDiv.className = 'clouds-effect';
  container.appendChild(cloudsDiv);
}

function addSunEffect(container) {
  const sunDiv = document.createElement('div');
  sunDiv.className = 'sun-effect';
  
  // Create SVG sun
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'sun-svg');
  svg.setAttribute('viewBox', '0 0 150 150');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  // Create gradients for the sun
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Radial gradient for the sun orb
  const orbGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  orbGradient.setAttribute('id', 'sunOrbGradient');
  orbGradient.setAttribute('cx', '50%');
  orbGradient.setAttribute('cy', '50%');
  orbGradient.setAttribute('r', '50%');
  
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('stop-color', '#ffeb3b');
  stop1.setAttribute('stop-opacity', '0.8');
  
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '70%');
  stop2.setAttribute('stop-color', '#ffc107');
  stop2.setAttribute('stop-opacity', '0.6');
  
  const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop3.setAttribute('offset', '100%');
  stop3.setAttribute('stop-color', '#ff9800');
  stop3.setAttribute('stop-opacity', '0.2');
  
  orbGradient.appendChild(stop1);
  orbGradient.appendChild(stop2);
  orbGradient.appendChild(stop3);
  
  // Linear gradient for rays
  const rayGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  rayGradient.setAttribute('id', 'sunRayGradient');
  rayGradient.setAttribute('x1', '0%');
  rayGradient.setAttribute('y1', '0%');
  rayGradient.setAttribute('x2', '0%');
  rayGradient.setAttribute('y2', '100%');
  
  const rayStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  rayStop1.setAttribute('offset', '0%');
  rayStop1.setAttribute('stop-color', '#ffeb3b');
  rayStop1.setAttribute('stop-opacity', '0');
  
  const rayStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  rayStop2.setAttribute('offset', '40%');
  rayStop2.setAttribute('stop-color', '#ffeb3b');
  rayStop2.setAttribute('stop-opacity', '0.6');
  
  const rayStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  rayStop3.setAttribute('offset', '100%');
  rayStop3.setAttribute('stop-color', '#ffeb3b');
  rayStop3.setAttribute('stop-opacity', '0.3');
  
  rayGradient.appendChild(rayStop1);
  rayGradient.appendChild(rayStop2);
  rayGradient.appendChild(rayStop3);
  
  defs.appendChild(orbGradient);
  defs.appendChild(rayGradient);
  svg.appendChild(defs);
  
  // Create rays group (behind the orb)
  const raysGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  raysGroup.setAttribute('class', 'sun-rays-group');
  
  // Primary rays (softer and wider)
  for (let i = 0; i < 8; i++) {
    const ray = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ray.setAttribute('x', '72');
    ray.setAttribute('y', '10');
    ray.setAttribute('width', '6');
    ray.setAttribute('height', '40');
    ray.setAttribute('fill', 'url(#sunRayGradient)');
    ray.setAttribute('rx', '3');
    ray.setAttribute('ry', '3');
    ray.setAttribute('opacity', '0.6');
    ray.setAttribute('filter', 'blur(0.5px)');
    ray.setAttribute('transform', `rotate(${i * 45} 75 75)`);
    raysGroup.appendChild(ray);
  }
  
  // Secondary rays (even softer)
  for (let i = 0; i < 8; i++) {
    const ray = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ray.setAttribute('x', '73');
    ray.setAttribute('y', '15');
    ray.setAttribute('width', '4');
    ray.setAttribute('height', '30');
    ray.setAttribute('fill', 'url(#sunRayGradient)');
    ray.setAttribute('rx', '2');
    ray.setAttribute('ry', '2');
    ray.setAttribute('opacity', '0.4');
    ray.setAttribute('filter', 'blur(1px)');
    ray.setAttribute('transform', `rotate(${i * 45 + 22.5} 75 75)`);
    raysGroup.appendChild(ray);
  }
  
  svg.appendChild(raysGroup);
  
  // Create sun orb group (in front of rays)
  const orbGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  orbGroup.setAttribute('class', 'sun-orb-group');
  
  const sunOrb = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  sunOrb.setAttribute('cx', '75');
  sunOrb.setAttribute('cy', '75');
  sunOrb.setAttribute('r', '30');
  sunOrb.setAttribute('fill', 'url(#sunOrbGradient)');
  
  orbGroup.appendChild(sunOrb);
  svg.appendChild(orbGroup);
  
  sunDiv.appendChild(svg);
  
  // Add sunshine background
  const sunshineBg = document.createElement('div');
  sunshineBg.className = 'sunshine-bg';
  container.appendChild(sunshineBg);
  
  container.appendChild(sunDiv);
}

function addWindEffect(container) {
  const windDiv = document.createElement('div');
  windDiv.className = 'wind-effect';
  
  // Add wind lines
  const windLines = document.createElement('div');
  windLines.className = 'wind-lines';
  windDiv.appendChild(windLines);
  
  // Add wind particles
  const particlesDiv = document.createElement('div');
  particlesDiv.className = 'wind-particles';
  
  // Create dust particles
  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.className = 'wind-particle dust';
    particle.style.top = (Math.random() * 60 + 20) + '%';
    particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
    particle.style.animationDelay = Math.random() * 5 + 's';
    particlesDiv.appendChild(particle);
  }
  
  // Create regular particles
  for (let i = 0; i < 10; i++) {
    const particle = document.createElement('div');
    particle.className = 'wind-particle';
    particle.style.top = (Math.random() * 50 + 25) + '%';
    particle.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
    particle.style.animationDelay = Math.random() * 3 + 's';
    particlesDiv.appendChild(particle);
  }
  
  // Create leaves
  const leafColors = ['', 'brown', 'yellow'];
  for (let i = 0; i < 8; i++) {
    const leaf = document.createElement('div');
    const colorClass = leafColors[Math.floor(Math.random() * leafColors.length)];
    leaf.className = `wind-leaf ${colorClass}`;
    leaf.style.top = (Math.random() * 70 + 15) + '%';
    leaf.style.animationDuration = (Math.random() * 4 + 3) + 's';
    leaf.style.animationDelay = Math.random() * 6 + 's';
    particlesDiv.appendChild(leaf);
  }
  
  windDiv.appendChild(particlesDiv);
  container.appendChild(windDiv);
}

function updateBackgroundForWeather(currentConditions) {
  const body = document.body;
  const condition = currentConditions.conditions.toLowerCase();
  const icon = currentConditions.icon.toLowerCase();
  
  // Remove existing weather classes
  body.classList.remove('sunny', 'rainy', 'stormy', 'snowy', 'foggy', 'cloudy');
  
  // Add weather-specific class for background animations
  if (condition.includes('rain') || condition.includes('drizzle') || icon.includes('rain')) {
    body.classList.add('rainy');
  } else if (condition.includes('thunder') || condition.includes('storm')) {
    body.classList.add('stormy');
  } else if (condition.includes('snow') || icon.includes('snow')) {
    body.classList.add('snowy');
  } else if (condition.includes('fog') || condition.includes('mist') || icon.includes('fog')) {
    body.classList.add('foggy');
  } else if (condition.includes('cloud') || icon.includes('cloud')) {
    body.classList.add('cloudy');
  } else if (condition.includes('clear') || condition.includes('sunny') || icon.includes('clear') || icon.includes('sun')) {
    body.classList.add('sunny');
  }
}

