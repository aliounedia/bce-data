
var request = require("request")
   ,cheerio = require("cheerio")
   ,fs      = require("fs")
   ,async   = require("async")
   ,_       = require("underscore")

   , conf   = require("./conf.js");


var Scraper = {};
module.exports =Scraper;

(function(my){
  "use strict";
  //Make request
  //Url should take line as argument , 

  my.Query = function(url, cb){
    console.log('my url ' + url)
    request(url, function(err, res, body){
     (err)? cb(null, err) : cb(null, body)
    })
  };
  //Query for Detail
  my.QueryDetail = function(line, cb){
    var url = line.split(",").pop()
    console.log(url)
    var q = {
      url: url,
      timeout:20000
    }
    request(q, function(err, res, body){
     (err)? cb(null, [line, err]) : cb(null, [line, body])
    })
  };
  my.WriteFile = function(src, data){
    fs.appendFile(src, data, function(err){
      if(err){
         throw err; return;
      };
    });
  };
              
  //The Main scraper, it scrape the main page , we will
  //define another function that scrape the page details
  my.Main = function(){
    var self =this
    var rows  = conf.nb_rows
       ,urls  = [];
    while(rows--)urls.push(conf.base_url + rows)
    console.log(urls)
    //End building urls
    async.mapSeries(urls, my.Query, handler)
         
    //Handle response , async raise error when I define  this.handler =function(xx)
    //I dont Know why , i will open issue.
    function handler(err, results){
      var data  =[]
      _.each(results, function(result){
        var parse = self.parse_body(result)
        data.push(parse)
      })
      console.log(data)
      my.WriteFile('datas/link.json', data.join('\n'))
    }

    // parse body 
    this.parse_body  = function(body){
      var $ = cheerio.load(body)
      var rows= []
      console.log($("div").html())
      $("div .views-table tr").each(function(idx, html){
        var row =[]
        $(this).find("td").each(function(idx , e){
           var raw = self.get_content($,e)
           raw     = _.unescape(new String(raw).trim().replace(/\n/g, "").replace(/,/g," "))	  
           row.push(raw)
        })
        rows.push(row.join(','))
      })
      return rows.join('\n')
    }

    //Get content of cell/td 
    this.get_content = function($,e){
      //content
      var  rx  = /<a[^>]*>([^<]+)<\/a>/
          ,rx2 = /<span[^>]*>([^<]+)<\/span>/
          ,rx3 = /Voir/;

      //check html with regex
      var text = $(e).html()
      if(rx3.test(text)){
          return conf.base_site + $(e).find("a").attr("href")
      }else if(rx.test(text)){
          return text.match(rx)[1]
      }else if(rx2.test(text)){
          return text.match(rx2)[1]
      }else{
          return text
      }
    }
  };
  

  //Define The details scrapper function
  //run this class just after running The main class 
  //This will use the json Temp file that result of the
  //main scrapeMain and crteate csv file

  my.Detail = function(){
    var self =this
    fs.readFile('datas/link.json', function (err, data) {
      if (err){throw err}
      var lines =  data.toString().split('\n')
      lines =_.filter(lines, function(line){
         return ( line && line.length >0 )
      })
      console.log("line length" + lines.length)
      async.mapSeries(lines, my.QueryDetail, handler);
    })

    //handleResponse
    function handler(err,results){
      var data = []
      _.each(results,function(result){
        var parse = self.parse_body(result[1])
        parse = parse.join(",") +  result[0] + "," + parse
        data.push(parse)
      })
      console.log(data)
      my.WriteFile('datas/data.csv', conf.HEAD)
      my.WriteFile('datas/data.scv', data.join('\n'))
    }
    // parse body 
    this.parse_body = function(body){
      var row  =[]
      var $ = cheerio.load(body)
      $("div .content ").each(
        function(idx, html){
          //var row =[]
          $(this).find(".field").each(function(idx, html){
          var ok = $(this).text().indexOf("de commerce:") !=-1 || $(this).text().indexOf("Capital:")  !=-1
          if(ok){
            console.log($(this).text())
            row.push($(this).text().split(":").pop())
          }
        })
      })
      return _.unique(row)
    }
  };
}(Scraper));

