//  Sam Ludlow's first Node.js / javascript application
//  Provides a simple HTML directory browser
//  Only works on Linux due to path format

"use strict";

const portNumber = 4444;

var http = require('http');
var fs = require('fs');

//  Used for column headings
var rootStats = fs.statSync('/');

var server = http.createServer(function (req, res) {

    if (req.url === '/favicon.ico') {
      return res.end();
    }

    //  The current directory is the url
    var path = decodeURI(req.url);

    //  If a file (download) link
    if (path.endsWith('?DOWNLOAD') == true) {
        
        SendFile(path, 9, res, 'application/octet-stream');
        return;
    }

    //  If a text file link
    if (path.endsWith('?TEXT') == true) {

        SendFile(path, 5, res, 'text/plain');
        return;
    }

    //  Normal directory browse page, prepare the HTML

    res.writeHead(200, {'Content-Type': 'text/html'});
    
    res.write('<h1>' + path + '</h1>');

    //  Provide an up directory link

    var up = '/';
    if (path.length > 1)
    {
        var slashIndex = path.lastIndexOf('/');
        if (slashIndex == 0)
            slashIndex = 1;
        up = path.substring(0, slashIndex);
    }
    res.write('<a href="' + up + '">UP : ' + up + '</a>');

    //  Read the contents of current directory
    fs.readdir(path, function(readdirErr, items) {
     
        if (readdirErr)
        {
            res.write('<p style="color:red;">' + readdirErr.toString() + '</p>');
        }

        if (items !== undefined)
        {
            //  Prepare a directory and files table
            res.write('<h2>Directories</h2>');
            res.write(MakeTable(items, path, true));

            res.write('<h2>Files</h2>');
            res.write(MakeTable(items, path, false));
        }

        res.end();
    });
});

server.listen(portNumber);

console.log("Server is running");

//  Prepare the HTML table from items list
function MakeTable(items, path, onlyDirectories)
{
    var result = '';

    result += '<table style="font-size: 14px">';

    var errorRows = '';

    // prepare the table headings

    result += '<tr>';
    result += '<th>Name</th>';
    for (var propName in rootStats)
    {
        if (SkipColumn(propName) == false)
            result += '<th>' + propName + '</th>';
    }
    result += '</tr>';

    //  For each filesystem item
    for (var itemIndex = 0; itemIndex < items.length; ++itemIndex) {

        var name = items[itemIndex];

        var fullPath = path;
        if (fullPath.endsWith('/') == false)
            fullPath += '/';
        fullPath += name;

        //  Get the info for filesystem item
        var stats = undefined;
        try
        {
            stats = fs.statSync(fullPath);
        }
        catch (e)
        {
            //  Produce an error row
            if (onlyDirectories == true)
                errorRows += '<tr><td>' + fullPath + '</td><td>' + e.toString() + '</td></tr>';
            continue;
        }
        
        if (onlyDirectories == true && stats.isDirectory() == false)
            continue;

        if (onlyDirectories == false && stats.isDirectory() == true)
            continue;

        // Prepare the link, if not a directory append a download command
        var rawLink = encodeURI(fullPath);
        var link = rawLink;
        if (stats.isDirectory() == false)
            link += '?TEXT';

        result += '<tr>';
        result += '<td>';
        result += '<a href="' + link + '">' + fullPath + '</a>';
        result += '</td>';
        
        //  Populate the table rows
        for (var propName in rootStats) {

            if (SkipColumn(propName) == true)
                continue;

            var text;
            if (propName.startsWith('is') == true)  //  These are functions
            {
                text = eval('stats.' + propName + '().toString()');
            } else {
                if (propName.endsWith('time') == true)  //  Dates need formatting
                {
                    text = DateFormat(stats[propName]);
                } else {

                    if (propName == 'size' && onlyDirectories == false) {
                        text = '<a href="' + rawLink + '?DOWNLOAD">' + stats[propName] + '</a>'
                    } else {
                        text = stats[propName];
                    }
                    
                }
            }
            result += '<td>' + text + '</td>';
        }

        result += '</tr>';
    }

    result += '</table>';

    if (errorRows !== '')
    {
        result += '<h2>Errors</h2>';
        result += '<table style="font-size: 14px">';
        result += '<tr><th>Name</td><th>Error</th></tr>';
        result += errorRows;
        result += '</table>';
    }

    return result;
}

//  Not bothered about these columns
function SkipColumn(propName)
{
    return (propName == '_checkModeProperty' || propName.endsWith('Ms') == true || propName == 'birthtime');
}

function DateFormat(d)
{
    return PadTwo(d.getDate()) + '/' + PadTwo(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' +
        PadTwo(d.getHours()) + ':' + PadTwo(d.getMinutes()) + ':' + PadTwo(d.getSeconds());
}

function PadTwo(num)
{
    return num.toString().padStart(2, '0');
}

function SendFile(path, trimLength, res, contentType) {

    path = path.substring(0, path.length - trimLength);

    //  Open read Stream to file
    var readStream = fs.createReadStream(path);
    
    //  Display error page if can't read file
    readStream.on('error', function(err) {
    
        res.writeHead(200, {'Content-Type': 'text/html'});
    
        res.write('<h1>Error accessing file</h1>');
        res.write('<p style="color:red;">' + err.toString() + '</p>');
        res.write('<p>Click back in your browser</p>');
                
        res.end();

        return;
    });
    
    //  Send file to client
    res.writeHead(200, {'Content-Type': contentType});
    readStream.pipe(res);
}
