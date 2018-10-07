'use strict';

const myutils = require('../../utils/myutils.js');
var program = require('commander');
program
    .version('1.0', '-v, --version')
    .option('-e, --env <environment>', 'Environement define in your build.properties')
    .option('-c, --connected-app <connected_app_api_name>', 'API Name of your connected app')
    .parse(process.argv);

var username = myutils.properties.get(`sf.${program.env}.username`);
var password = myutils.properties.get(`sf.${program.env}.password`);
var loginEndpoint = 'https://test.salesforce.com';
var useoauth = false;
var oauthparams = {
    loginUrl: loginEndpoint,
    clientId: myutils.properties.get(`sf.${program.env}.${program.connectedApp}.consumer_id`),
    clientSecret: myutils.properties.get(`sf.${program.env}.${program.connectedApp}.consumer_secret`),
    redirectUri: myutils.properties.get(`sf.${program.env}.${program.connectedApp}.callback_url`)
}

//request for updates in days starting backwards from current date.
var recent_decider = 2;


var jsforce = require('jsforce');
var fs = require('fs');
var conn = undefined;
if (useoauth) {
    conn = new jsforce.Connection({
        oauth2: oauthparams
    });
}
else {
    conn = new jsforce.Connection({
        loginUrl: 'https://test.salesforce.com'
    });
}
var ProgressBar = require('progress');
conn.login(username, password, function (err, userInfo) {
    if (err) { console.log(err) }
    console.log('you are connected to ');
    console.log(userInfo);

    conn.metadata.describe().then(function (res) {
        var metaobjects = res.metadataObjects;
        var lstmetaquery = [];
        var startTime = new Date();
        var initialcount = Math.round(metaobjects.length / 3);
        var completedcount = initialcount;
        var bar = new ProgressBar('  Processing [:bar] :percent :etas', {
            complete: '='
            , incomplete: ' '
            , width: 80
            , total: initialcount
        });
        (function next() {
            if (initialcount) {
                if (completedcount == 0)
                    bar.complete = true;
                var chunk = initialcount - completedcount;
                bar.tick(chunk);

                if (!bar.complete) {
                    setTimeout(next, Math.random() * 2000);
                }
                else {
                    console.log('Finished processing ... cleaning up...');
                }
            }
        })();

        for (var i = 0; i < metaobjects.length; i++) {
            lstmetaquery.push({ type: metaobjects[i].xmlName });
            if (metaobjects[i].hasOwnProperty('childXmlNames') && metaobjects[i].childXmlNames.hasOwnProperty('length')) {
                var childnames = metaobjects[i].childXmlNames;
                for (var j = 0; j < childnames.length; j++)
                    lstmetaquery.push({ type: childnames[j] });
            }
        }
        lstmetaquery.sort();
        fs.writeFile('completeinfo_' + userInfo.organizationId + '.csv', '"Type","fullName","lastModifiedById","lastModifiedByName","lastModifiedDate","createdDate","namespacePrefix","manageableState","createdById"\n', function (err) { if (err) console.log(err) });
        fs.writeFile('recent_' + userInfo.organizationId + '.csv', '"Type","fullName","lastModifiedById","lastModifiedByName","lastModifiedDate","createdDate","namespacePrefix","manageableState"\n', function (err) { if (err) console.log(err) });
        for (var i = 0; i < lstmetaquery.length; i = i + 3) {
            var newlist = lstmetaquery.slice(i, i + 3);
            setTimeout(getlists(newlist, i), 100);
        }

        function getlists(listquery, counter) {
            conn.metadata.list(newlist).then(function (result) {
                if (result != undefined && result.hasOwnProperty('length')) {
                    var completeinfostr = '';
                    var recentdaysstr = '';
                    for (var j = 0; j < result.length; j++) {
                        completeinfostr += '"' + result[j].type + '","' + result[j].fullName + '","' + result[j].lastModifiedById + '","' + result[j].lastModifiedByName + '","' + result[j].lastModifiedDate + '","' + result[j].createdDate + '","' + result[j].namespacePrefix + '","' + result[j].manageableState + '","' + result[j].createdById + '"\n';
                        diffdays = getDiff(result[j].lastModifiedDate);
                        if (diffdays < recent_decider)
                            recentdaysstr += '"' + result[j].type + '","' + result[j].fullName + '","' + result[j].lastModifiedById + '","' + result[j].lastModifiedByName + '","' + result[j].lastModifiedDate + '","' + result[j].createdDate + '","' + result[j].namespacePrefix + '","' + result[j].manageableState + '","' + result[j].createdById + '"\n';
                    }
                }
                fs.appendFile('completeinfo_' + userInfo.organizationId + '.csv', completeinfostr, function (err) { if (err) console.log(err) });
                fs.appendFile('recent_' + userInfo.organizationId + '.csv', recentdaysstr, function (err) { if (err) console.log(err) });
                completedcount--;
            });
        }

        function getDiff(datestr) {
            var currentDate = new Date();
            var recordDate = new Date(datestr);
            var timeDiff = Math.abs(currentDate.getTime() - recordDate.getTime());
            var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            return diffDays;
        }

    });
});
