const request = require('request');
const fs = require('fs');
const cities = require('./cities.json');

const forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast/daily?APPID='
const apiKey = 'fff9f900987a05902f07d757aba5540f';

const fileName = process.argv[2] || 'result.csv';

processCitiesForecasts();
 
function processCitiesForecasts(){
    
    const promises = createPromises(cities);
    
    const processedData = Promise.all(promises)
                                 .then(calculateTopValues);
    
    writeCsvfile(processedData, fileName);

    console.log(`finished, filename: ${fileName}`);
}

function createPromises(cities){
    return cities.map(city => getForecastForCity(city).then(mapResponseToDateMaxMinForecast));
}
 
function calculateTopValues(cityForecasts) {
    var dates = Object.keys(cityForecasts[0].forecasts);

    return dates.map(dt => {
        const currMax = { max: 0, city: null };
        const currMin = { min: Number.MAX_VALUE, city: null };
        const rain = [];

        cityForecasts.forEach(city => {
            if(city.forecasts[dt].max > currMax.max){
                currMax.max = city.forecasts[dt].max;
                currMax.city = city;
            };
            
            if(city.forecasts[dt].min < currMin.min){
                currMin.min = city.forecasts[dt].min;
                currMax.city = city;

            };

            if(city.forecasts[dt].hasRain){
                rain.push(city.cityName)
            }
        });

        return {
            dt: dt,
            max: currMax.city.cityName,
            min: currMin.city.cityName,
            hasRain: rain
        }
    });

}

function writeCsvfile(processedData, fileName) {

    const outputStream = fs.createWriteStream(fileName, { encoding: 'utf8' });

    outputStream.once('open', function(fd) {

        outputStream.write(mapDataToCSVheaders(processedData[0]));

        processedData.forEach(dayForecast => {
            outputStream.write(mapDataToCSVline(dayForecast));
        });
       
        outputStream.end();
    });
};

mapDataToCSVheaders = (dataLine => {
    return 'DAY, highest Temp, lowest temp, raining on:';
});
mapDataToCSVline = (dataLine => {
    return `${Date(dataLine.dt + 1000)},${dataLine.max},${dataLine.min},${dataLine.hasRain}`;
});

function getForecastForCity(cityname) {
    return new Promise((resolve, reject) => {
        request.get(`${forecastUrl}${apiKey}&q=${cityname}`, {json: true }, (err, resp, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
}

const mapResponseToDateMaxMinForecast = (cityName) => (weatherResp) => ({
    city: cityname,
    forecasts = weatherResp.list.reduce((map, obj) => {
        map[obj.dt] = {
            dateTime: new Date(obj.dt * 1000),
            min: obj.temp.min,
            max: obj.temp.max,
            hasRain: !!obj.rain && obj.rain > 0
        };
        return map;
    })
});
