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
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${city}?unitGroup=metric&key=H8Q3TMEPZZGYLERHCZLH5SMNF&contentType=json`
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
          <div>${hour.temp} °C</div>
        </div>
      `;
    })
  );

  // Only next 5 days
  const forecastItems = await Promise.all(
    data.days.slice(0, 5).map(async (day) => {
      const dayIconUrl = await getIcon(day.icon);
      return `
        <li class="forecast-item">
          <img src="${dayIconUrl}" alt="Icon" class="forecast-icon">
          <strong>${day.datetime}</strong>: 
          ${day.temp} °C, 
          ${day.conditions}
        </li>
      `;
    })
  );

  // More relevant current conditions
  const cc = data.currentConditions;
  weatherResult.innerHTML = `
    <h2>Weather in ${data.address}</h2>
    <p><strong>Temperature:</strong> ${cc.feelslike} °C</p>
    <p><strong>Condition:</strong> ${cc.conditions}</p>
    <img src="${iconUrl}" alt="Weather icon">
    <div class="current-details">
      <p><strong>Humidity:</strong> ${cc.humidity}%</p>
      <p><strong>Wind:</strong> ${cc.windspeed} km/h</p>
      <p><strong>Pressure:</strong> ${cc.pressure} hPa</p>
      <p><strong>UV Index:</strong> ${cc.uvindex ?? "N/A"}</p>
      <p><strong>Visibility:</strong> ${cc.visibility ?? "N/A"} km</p>
      <p><strong>Cloud Cover:</strong> ${cc.cloudcover ?? "N/A"}%</p>
    </div>
    <p class="alert">alert: ${data.alerts.length > 0 ? data.alerts[0].description : "No alerts"}</p>
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
}

