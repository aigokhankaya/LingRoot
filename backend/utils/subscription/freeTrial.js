function addMonthsClamped(baseDate, months) {
    const source = new Date(baseDate);
    const day = source.getUTCDate();
    const target = new Date(source);

    target.setUTCDate(1);
    target.setUTCMonth(target.getUTCMonth() + months);

    const lastDayOfTargetMonth = new Date(Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth() + 1,
        0
    )).getUTCDate();

    target.setUTCDate(Math.min(day, lastDayOfTargetMonth));
    target.setUTCHours(
        source.getUTCHours(),
        source.getUTCMinutes(),
        source.getUTCSeconds(),
        source.getUTCMilliseconds()
    );

    return target;
}

function getInitialFreeTrialEndDate(baseDate = new Date()) {
    return addMonthsClamped(baseDate, 1).toISOString();
}

module.exports = {
    addMonthsClamped,
    getInitialFreeTrialEndDate,
};
