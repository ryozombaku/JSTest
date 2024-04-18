const { parse } = require("csv-parse");
const fs = require("fs");

// specify the path of the CSV file
const path = "./balance.csv"; // так таблица должна называться
var r = 1; // текущий ряд в таблице во время парсинга
var countries = new Array(); // список стран из таблицы - состоит из словарей {название; под-словарь, который состоит из {дата; инфо}}
var countryNames = new Array(); // список названий стран
var types = new Array(); // список BalanceType - обязательно должны начинаться через 1 пустой столбец после стран
var mapOutput = new Map();
var stringOutput = "";
fs.createReadStream(path)
    .pipe(parse({ delimiter: ",", from_line: 1 }))
    .on("data", function (row) {
        if (r == 1) { // первый ряд - запоминаем страны
            let curCountry = 1; // т.к. названия стран в таблице идут со 2 столбца
            do {
                let country = new Map();
                country.set(row[curCountry], new Map()); // пока что под-словарь пустой
                countries.push(country);
                countryNames.push(row[curCountry]);
                curCountry++;
            }
            while (row[curCountry] != "" || null); // до тех пор, пока список в таблице не прервется
        }
        else { // т.к. данные в таблицы идут со 2 строки
            for (let i = 0; i < countries.length; i++) {
                let data = new Map();
                data.set(row[0], row[i + 1]); // создаем под-словарь с данными о дате и текущей стране
                countries[i].get(countryNames[i]).set(row[0], row[i + 1]); // находим страну по названию и добавляем данные
            }
            for (let t = countries.length + 1; t < row.length; t++) // после пустого столбца записываем все BalanceType
                if (row[t] != "")
                    types.push(row[t]);
        }
        //console.log("Row", r, row);
        r++;
    })
    .on("error", function (error) {
        console.log(error.message);
    })
    .on("end", function () {
        console.log("File read successful."); // в этот момент у нас есть данные по каждой стране и список всех BalanceType
        console.log("List of countries:");
        console.log(countries);
        console.log("List of balance types:");
        console.log(types);
        console.log("\n***\n");
        for (let c = 0; c < countries.length; c++) { // для каждой страны
            let countryBalance = new Array();
            for (let t = 0; t < types.length; t++) { // для каждого типа
                let typeBalance = new Map();
                let trimmedDates = new Array();
                let dates = Array.from(countries[c].get(countryNames[c]).keys());
                let values = Array.from(countries[c].get(countryNames[c]).values());
                for (let i = 0; i < values.length; i++) {
                    if (values[i].includes(types[t])) { // проверяем упоминается ли в строчке данных тип
                        trimmedDates.push(dates[i]); // собираем массив дат для каждого отдельного типа
                    }
                }
                if (trimmedDates.length > 0) {
                    typeBalance.set("start_date", trimmedDates[0]);
                    typeBalance.set("end_date", trimmedDates[trimmedDates.length - 1]);
                    typeBalance.set("balance", types[t]);
                    //console.log("Trimmed dates:", trimmedDates); // тут можно посмотреть списки дат для каждого типа
                    countryBalance.push(typeBalance);
                }
            }
            mapOutput.set(countryNames[c] + "_Balance", countryBalance); // собираем словарь стран и их балансов
        }
        console.log("Output:");
        console.log(mapOutput); // в этот момент у нас есть необходимый словарь, теперь преобразуем его в string
        console.log("\n***\n");
        function smartReplacer(key, value) { // чтобы stringify мог работать со сложными объектами, используем replacer
            if (value instanceof Set) { // чтобы опознавал вложенные массивы
                return [...value];
            }
            else if (value instanceof Map) {
                return Object.fromEntries(value.entries()); // чтобы превращал словари в объекты
            }
            return value;
        }
        stringOutput = JSON.stringify(Object.fromEntries(mapOutput.entries()), smartReplacer, "\t"); // string-версия готова
        console.log("Stringified version:");
        console.log(stringOutput);
        fs.writeFile("outputtask3.json", stringOutput, (error) => {
            if (error) {
                console.error(error);
                throw error;
            }
            console.log("outputtask3.json written correctly."); // json-файл готов
        });
    });
