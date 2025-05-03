import moment from "moment";

export function formatDate(date = new Date(), format = 'DD/MM/YYYY HH:mm:ss') {
    return moment(date).format(format)
}