import moment from "moment";

/** По умолчанию форматирует дату в вид `'DD/MM/YYYY HH:mm:ss'` */
export function formatDate(date = new Date(), format = 'DD/MM/YYYY HH:mm:ss') {
    return moment(date).format(format)
}