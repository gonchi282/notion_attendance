import { createRequire } from "module"
import { Client } from "@notionhq/client"
const require = createRequire(import.meta.url)
const fs = require("fs")
const iconvv = require("iconv-lite")

const accessinfo_json = fs.readFileSync('accessinfo.json', 'utf-8')
const accessinfo = JSON.parse(accessinfo_json)

console.log(accessinfo.apikey)
console.log(accessinfo.database_id)

const notion = new Client( { auth : accessinfo.apikey} )
const databaseId = accessinfo.database_id

async function addItem(databaseId, text) {
    try {
        const response = await notion.pages.create({
            parent: {databaseId: databaseId },
            properties: {
                title: {
                    title: [
                        {
                            "text": {
                                "content": text
                            }
                        }
                    ]
                }
            }
        })
        console.log(response)
        console.log("Success! Entry added.")
    } catch (error) {
        console.error(error, body)
    }
}

async function queryItem(databaseId, filter) {
    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: filter,
            sorts : [
                {
                    property : "日付",
                    direction: "ascending"
                },
                {
                    property : "名前",
                    direction: "ascending"
                }
            ]
        })
        return response
    } catch (error) {
        console.error(error.body)
    }

    return null
}

function print_database(data_str, properties) {
    properties.forEach(property => process.stdout.write(`${property.name}\t`))
    console.log()
    data_str.forEach(data => {
        properties.forEach(property => {
            if (data[property.name]) {
                process.stdout.write(`${data[property.name]}\t`)
            }
        })
        console.log();
    })
}

function convert_string_object(results, properties) {
    let datas = []
    results.forEach(result => {
        let data = {}
        properties.forEach(property => {
            let dataobj = result.properties[property.name]
            dataobj[property.name] = ''
            switch (property.type) {
                case 'text':
                    if (dataobj.title[0]) {
                        data[property.name] = dataobj.title[0].plain_text;
                    }
                    break;
                case 'date':
                    if (dataobj.date) {
                        data[property.name] = dataobj.date.start
                    }
                    break;
                case 'rich_text':
                    if (dataobj.rich_text[0]) {
                        data[property.name] = dataobj.rich_text[0].plain_text
                    }
                    break;
                case 'number':
                    if (dataobj.number) {
                        data[property.name] = dataobj.number//.toString(10)
                    }
                    break;
                case 'select':
                    if (dataobj.select) {
                        data[property.name] = dataobj.select.name
                    }
                    break;
                default:
                    break;
            }
        })
        datas.push(data)
    })

    return datas
}

function make_csv_header(properties) {
    let header = properties.map(property => property.name);
    return header
}

function export_csv(header, datas) {
    let header_str = ""
    header.forEach(elem => {
        header_str += elem;
        if (header.slice(-1)[0] == elem) {
            header_str += "\n";
        } else {
            header_str += "\t"
        }
    })

    let data_str = ""
    datas.forEach(data => {
        header.forEach(elem => {
            let text = ""
            if (data[elem]) {
                text = data[elem]
            }

            data_str += text;

            // 最後の要素の場合は改行
            if (header.slice(-1)[0] == elem) {
                data_str += "\n";
            } else {
                data_str += "\t"
            }
        })
    })

    fs.writeFileSync("csvdata.tsv", "")
    let fd = fs.openSync("csvdata.tsv", "w")
    let buf = iconvv.encode(header_str + data_str, "Shift_JIS")
    fs.write(fd, buf, 0, buf.length, (err, written, buffer) => {})
}

function to_time_format(time) {
    let integer = Math.floor(time)
    let decimal = time - integer
    let decimal_time = Math.floor(decimal * 60)
    let time_str = `${integer}:${decimal_time}`
    return time_str
}

function to_weekly_reports_format(datas) {
    let lines = ""
    datas.forEach(data => {
        let line = ""
        line += (data["日付"] ?? "") + "\t"
        line += (data["カテゴリ"] ?? "") + "\t"
        line += (data["詳細"] ?? "") + "\t"
        line += (data["種別"] ?? "") + "\t"
        for (let loop = 0; loop < 2; loop++) {
            for (let loop = 0; loop < 3; loop++) {
                line += (data["工数"] ?? 0).toString() + "\t"
            }
            line += "時間\t"
            if (loop < 1) {
                line += to_time_format(data["工数"] ?? 0) + "\t"
            } else {
                line += to_time_format(data["工数"] ?? 0)
            }
        }
        lines += line + "\n"
    })

    fs.writeFileSync("csvdata.tsv", "")
    let fd = fs.openSync("csvdata.tsv", "w")
    let buf = iconvv.encode(lines, "Shift_JIS")
    fs.write(fd, buf, 0, buf.length, (err, written, buffer) => {})
}



const property_json = fs.readFileSync('properties.json', 'utf-8')
const properties = JSON.parse(property_json)
const filter_json = fs.readFileSync('filter.json', 'utf-8')
const filter = JSON.parse(filter_json)
console.log(filter)

const response = await queryItem(databaseId, filter)
const data_str = convert_string_object(response.results, properties)
//print_database(data_str, properties)
//const header = make_csv_header(properties)
//export_csv(header,data_str)
to_weekly_reports_format(data_str)