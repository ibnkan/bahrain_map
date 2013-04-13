var map;
var markers = [];
var infowindow;
var bahrainbounds;
var currentsearch = null;
var currentmarker = null;

window.onload = loadGmapsAPI;
function loadGmapsAPI() {
    $.mobile.showPageLoadingMsg();
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&language=ar&' + 'callback=initialise';
    document.body.appendChild(script);
    $.mobile.hidePageLoadingMsg();
}

function initialise() {
    initialiseMap();
    initialiseMenu();
    refreshControlButtons();
    $("#menu").panel("open");
}

function initialiseMap() {
    var mapOptions = {
        zoom: 10,
        center: new google.maps.LatLng(26.05, 50.55),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        panControl: false,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: false,
        streetViewControl: false,
        overviewMapControl: false
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    bahrainbounds = new google.maps.LatLngBounds(new google.maps.LatLng(25.791, 50.372),
        new google.maps.LatLng(26.339, 50.726));
    map.fitBounds(bahrainbounds);

    infowindow = new google.maps.InfoWindow();
    google.maps.event.addListener(map, 'click', function() {
        infowindow.close();
        currentmarker = null;
        refreshControlButtons();
        $("#index").text("");

    });
}
function initialiseMenu() {
    $("#menu").on("click", "a", function () {
        switch ($(this).attr("href")) {
            case "#protests":
                searchTweets("(مسيرة OR مسيرات OR مظاهرة OR مظاهرات OR اعتصام) (");
                break;
            case "#arrests":
                searchTweets("(اعتقال OR عتقل OR افراج OR سراح) (");
                break;
            case "#checkpoints":
                searchTweets("\"نقطة تفتيش\" (#chpo OR ");
                break;
            case "#police":
                searchTweets("(شرطة OR شغب OR مرتزق OR قوات OR قمع OR قتح OR داهم) (");
                break;
            case "#anything":
                searchTweets("(");
                break;
            default:
                break;
        }
        if($(this).attr("href") != "#") {
            $("header h1").html($(this).html());
            $("#menu").panel("close");
            map.fitBounds(bahrainbounds);
        }
    });

    $("#search").change(function() {
        if($(this).val() != ""){
            searchTweets($(this).val() + " (");
            $("header h1").text($("#search").val());
            $("#menu").panel("close");
        }
    });

    $("#refresh").click(function(){
        clearMarkers();
        searchTweets(currentsearch);
    });
    $("#prev").click(function(){
        if (markers.length > 0) {
            if(currentmarker != null && currentmarker < markers.length){
                currentmarker++;
            }
            else {
                currentmarker = markers.length - 1;
            }
            openCurrentMarker();
        }
    });
    $("#next").click(function(){
        if (markers.length > 0) {
            if(currentmarker != null && currentmarker > 0){
                currentmarker--;
            }
            else {
                currentmarker = 0;
            }
            openCurrentMarker();
        }    });
    $("#info").click(function(){
        $.mobile.showPageLoadingMsg();
        if(markers[currentmarker].translation == "") {
            $.getJSON("http://api.mymemory.translated.net/get?langpair=ar|en&de=reda@bahrainwatch.org&q="
                + markers[currentmarker].text,function(data){
                markers[currentmarker].translation = data.responseData.translatedText;
                markers[currentmarker].lang = "en";
            })
                .error(function(err){showError(err)})
                .complete(function(){
                    infowindow.close();
                    openCurrentMarker();
                    $.mobile.hidePageLoadingMsg()
                });
        }
        else{
            markers[currentmarker].lang = markers[currentmarker].lang == "en"? "ar" : "en";
            infowindow.close();
            openCurrentMarker();
            $.mobile.hidePageLoadingMsg()
        }
    });


}

function refreshControlButtons() {
    if (markers.length > 0) {
        if(currentmarker == null) {
            $("#prev").removeClass("ui-disabled");
            $("#next").removeClass("ui-disabled");
        }
        else {
            if(currentmarker == markers.length - 1) {$("#prev").addClass("ui-disabled");}
            else {$("#prev").removeClass("ui-disabled");}
            if(currentmarker == 0) {$("#next").addClass("ui-disabled");}
            else {$("#next").removeClass("ui-disabled");}
        }
    }
    else {
        $("#prev").addClass("ui-disabled");
        $("#next").addClass("ui-disabled");
    }
    if($("div .infowindow").length > 0) {
        $("#info").removeClass("ui-disabled");
    }
    else{
        $("#info").addClass("ui-disabled");
    }
}

function openCurrentMarker() {
    var timestamp = formatTime(markers[currentmarker].created_at);

    var text =  markers[currentmarker].lang == "ar"?
        markers[currentmarker].text : markers[currentmarker].translation;

    for(l in markers[currentmarker].urls) {
        var e_url = markers[currentmarker].urls[l].expanded_url;
        var d_url = markers[currentmarker].urls[l].display_url;
        text = text.replace(markers[currentmarker].urls[l].url,
            '<a href="' + e_url +'\">' + d_url + '</a>');
    }

    var media = '';
    for(m in markers[currentmarker].media) {
        media += '<img class="tweet-media" src="'
            + markers[currentmarker].media[m].media_url_https
            + ':thumb\"> ';
        var e_url = markers[currentmarker].media[m].expanded_url;
        var d_url = markers[currentmarker].media[m].display_url;
        text = text.replace(markers[currentmarker].media[m].url,
            '<a href="' + e_url +'\">' + d_url + '</a>');
    }



    var html =
        '<div class="infowindow">'

            + '<div class="profile">'
            + '<a class="profile-link" href="https://twitter.com/' + markers[currentmarker].from_user
            + '\" title="User Profile">@' + markers[currentmarker].from_user + '</a>'
            + '<a href="https://twitter.com/' + markers[currentmarker].from_user
            + '\" title="User Profile">'
            +'<img class="profile-image" src="' + markers[currentmarker].profile_image_url + '\"></a>'
            + '</div>'

            + '<div class="tweet-text">' + text.replace(/(@|#)\w+:*/g, "").replace(/["“”]/g,"").replace(/^:/g,"") + '</div>'
            + '<div class="tweet-time">' + timestamp[0] + '</div>'
            + '<div class="tweet-duration">' + timestamp[1] + '</div>'

            + media

            + '</div>';

    infowindow.setContent(html);
    infowindow.open(map, markers[currentmarker]);
    $("#index").text(currentmarker + 1 + '/');
    refreshControlButtons();
}

function searchTweets(keywords) {
    clearMarkers();
    currentsearch = keywords;
    var ar = /[\u0600-\u06FF]/;
    var arabic = ar.test(keywords);
    keywords += arabic? "#Bahrain OR #البحرين)" : keywords == "("?"#Bahrain OR #البحرين)":"#Bahrain)";
    keywords += "-filter:retweets";
    $.ajax({
        url: 'https://search.twitter.com/search.json',
        type: 'GET',
        dataType: 'jsonp',
        data: {
            q: keywords,
            lang: arabic? "ar" : "",
            result_type: "recent",
            include_entities: 1,
            rpp: 100
        },
        beforeSend: $.mobile.showPageLoadingMsg(),
        success:function(response){processTweets(response.results)},
        error: function(err){showError(err)}
    });
}

function clearMarkers(){
    for (i in markers) {
        markers[i].setMap(null);
    }
    markers.length = 0;
}

function processTweets(tweets) {
    for (i in tweets) {
        var latlng = findLocation(tweets[i].text);
        if (latlng !== null) {

            latlng[0] = parseFloat(latlng[0])+randomDecimal();
            latlng[1] = parseFloat(latlng[1])+randomDecimal();

            var index = markers.length;
            var marker = new google.maps.Marker({
                map: map,
                position: new google.maps.LatLng(latlng[0], latlng[1]),
                title: latlng[2] + ' ' + index,
                index: index,
                created_at: tweets[i].created_at,
                from_user: tweets[i].from_user,
                profile_image_url: tweets[i].profile_image_url,
                text: tweets[i].text,
                urls: tweets[i].entities.urls,
                media: tweets[i].entities.media,
                translation: "",
                lang: "ar",
                icon: 'marker.png',
                draggable: false
            });
            markers.push(marker);

            google.maps.event.addListener(markers[markers.length - 1], 'click', function() {
                currentmarker = this.index;
                openCurrentMarker();
                $("#index").text(currentmarker + 1 + '/');
            });

        }

    }
    if(markers.length > 1) {
        markers_bounds = new google.maps.LatLngBounds();
        for(m in markers){
            markers_bounds.extend(markers[m].getPosition());
        }
        map.fitBounds(markers_bounds);
        currentmarker = 0;
        openCurrentMarker();
        $("#total").text(markers.length);

    }
    $.mobile.hidePageLoadingMsg();
}

function showError(err) {
    $.mobile.hidePageLoadingMsg();
    alert("Error connecting to Twitter: " + err);
}


function formatTime(tweet_time){

    var d = new Date(tweet_time);
    var now = new Date();
    var timelength = (now - d)/60000;
    var timestamp = [];

    timestamp [0] = d.toDateString().substr(0,3) +', '
        + d.toDateString().substr(8,2) + ' '
        + d.toDateString().substr(4,3);

    var tt;
    if (d.getHours() >= 12) {
        tt = " PM";
        if (d.getHours() > 12) {
            d.setHours(d.getHours() - 12);
        }
    }
    else {
        tt = " AM";
        if (d.getHours() == 0) {
            d.setHours(12);
        }
    }

    timestamp [0] += ' | ' + d.getHours() + ':' + (d.getMinutes()<10?'0':'') + d.getMinutes() + tt;

    timestamp [1] =
        timelength < 1      && "قبل لحظات" ||
            timelength < 2      && "قبل دقيقة" ||
            timelength < 11     && "قبل " + Math.floor(timelength) + " دقائق" ||
            timelength < 60     && "قبل " + Math.floor(timelength) + " دقيقة" ||
            timelength < 90     && "قبل ساعة" ||
            timelength < 120    && "قبل ساعة و نصف" ||
            timelength < 180    && "قبل ساعتان" ||
            timelength < 660    && "قبل " + Math.floor(timelength/60) + " ساعات" ||
            timelength < 1440   && "قبل " + Math.floor(timelength/60) + " ساعة" ||
            (now.getDate()-d.getDate()) == 1   && "بالأمس" ||
            (now.getDate()-d.getDate()) > 1    && "";

    return timestamp;
}

var y = 1;
function randomDecimal() {
    y *= -1;
    var x = y * (Math.random() * 0.00075);
    return x;

}

function findLocation(tweet_text) {
    var latlng = null;
    for (place in mappoints) {
        if (place == tweet_text.match(place)) {
            latlng = mappoints[place].match(/\d+[.]\d+/g);
            latlng.push(place)
            break;
        }
    }
    return latlng;
}
var mappoints = {
    "محطة جواد": "26.224428,50.521148",
    "مركز ١٧": "26.08602,50.50948",
    "مركز 17": "26.08602,50.50948",
    "دوار ١٣": "26.09694,50.50031",
    "دوار 13": "26.09694,50.50031",
    "دوار 12": "26.10320,50.49833",
    "دوار ١٢": "26.10320,50.49833",
    "دوار 17": "26.08602,50.50948",
    "دوار ١٧": "26.08602,50.50948",
    "دوار النعيمي": "26.15960,50.52135",
    "دوار الفخار": "26.16148,50.52221",
    "كنيسة": "26.23215,50.58223",
    "كنيسه": "26.23215,50.58223",
    "فخر البحرين": "26.187042,50.537737",
    "فخر #البحرين": "26.187042,50.537737",
    "فخر المملكة": "26.187042,50.537737",
    "كوبري مدينة عيسى": "26.17472,50.54114",
    "جسر مدينة عيسى": "26.17472,50.54114",
    "شارع مدينة عيسى": "26.17472,50.54114",
    "إشارات سلماباد": "26.18675,50.53578",
    "اشارات سلماباد": "26.18675,50.53578",
    "تقاطع سلماباد": "26.18675,50.53578",
    "تقاطع مدينة عيسى": "26.18675,50.53578",
    "مدخل مدينة عيسى": "26.16981,50.54479",
    "بوابة مدينة عيسى": "26.16981,50.54479",
    "وزارة العمل": "26.16772,50.54063",
    "مجمع الريف": "26.09314,50.48901",
    "قلعة": "26.225056,50.577262",
    "قلعه ": "26.225056,50.577262",
    "سياقة": "26.16037,50.53123",
    "بندر": "26.148230,50.619467",
    "شيخ عزيز": "26.204056,50.534593",
    "دوار عبدالكريم":"26.21918,50.53042",
    "دوارعبدالكريم":"26.21918,50.53042",
    "دوار القدم": "26.21794,50.52132",
    "دوارالقدم": "26.21794,50.52132",
    "جيان": "26.22937,50.53732",
    "شارع المعارض": "26.23352,50.59461",
    "معارض": "26.22909,50.54350",
    "حديقة السلمانية": "26.22132,50.58345",
    "سلمانية": "26.21759,50.57114",
    "الدير": "26.28417,50.62361",
    "سماهيج": "26.2826,50.6337",
    "قلالي": "26.27333,50.65028",
    "بسيتين": "26.26417,50.60637",
    "عراد": "26.2590,50.6306",
    "محرق": "26.25722,50.61194",
    "برهامة": "26.22450,50.55498",
    "الحد ": "26.24556,50.65417",
    "الدبلوماسية": "26.2429,50.5870",
    "رأس رمان": "26.23738,50.58558",
    "راس رمان": "26.23738,50.58558",
    "جد الحاج": "26.2343,50.5017",
    "جدالحاج": "26.2343,50.5017",
    "حورة": "26.2337,50.5932",
    "السيف": "26.23222,50.53681",
    "كرباباد": "26.2306,50.5289",
    "كرانة": "26.22917,50.50944",
    "باربار": "26.2281,50.4804",
    "الحلة": "26.2278,50.5199",
    "نعيم": "26.2277,50.5684",
    "حلة عبدالصالح": "26.2275,50.5166",
    "سنابس": "26.2268,50.5456",
    "جنوسان": "26.2258,50.4948",
    "الديه": "26.2258,50.5357",
    "مقشع": "26.2222,50.5173",
    "قضيبية": "26.2210,50.5912",
    "جدحفص": "26.21861,50.54778",
    "بو صيبع": "26.2174,50.5023",
    "بوصيبع": "26.2174,50.5023",
    "دراز": "26.2164,50.4678",
    "القدم": "26.2164,50.5175",
    "صالحيه": "26.2157,50.5590",
    "صالحية": "26.2157,50.5590",
    "منامة": "26.21536,50.5832",
    "شاخورة": "26.21472,50.50694",
    "عدلية": "26.2146,50.5847",
    "جبلة حبشي": "26.2137,50.5275",
    "جبلةحبشي": "26.2137,50.5275",
    "بني جمرة": "26.2135,50.4571",
    "بني جمره": "26.2135,50.4571",
    "الحجر": "26.2132,50.5117",
    "بديع": "26.21306,50.45",
    "عين الدار": "26.2122,50.5363",
    "مقابة": "26.2112,50.4851",
    "جفير": "26.2110,50.6011",
    "زنج": "26.2105,50.5652",
    "مرخ": "26.2084,50.4733",
    "بلاد القديم": "26.2080,50.5559",
    "بلادالقديم": "26.2080,50.5559",
    "ماحوز": "26.2079,50.5859",
    "مصلى": "26.20667,50.53868",
    "خميس": "26.2064,50.5493",
    "غريفة": "26.2055,50.6021",
    "سهلة الشمالية": "26.2079,50.5310",
    "سهلة الجنوبية": "26.2002,50.5317",
    "سهلة": "26.2048,50.5265",
    "الحصم": "26.2029,50.5951",
    "عذاري": "26.1990,50.5508",
    "بوقوة": "26.1966,50.5146",
    "بو قوة": "26.1966,50.5146",
    "سار": "26.1953,50.4855",
    "جنبية": "26.1909,50.4645",
    "توبلي": "26.1889,50.5501",
    "حجير": "26.1850,50.5514",
    "سلماباد": "26.1834,50.5175",
    "نبيه صالح": "26.1821,50.5847",
    "جدعلي": "26.17917,50.56028",
    "جد علي": "26.17917,50.56028",
    "مدينة عيسى": "26.17361,50.54778",
    "عالي": "26.1521,50.5251",
    "مدينة زايد": "26.1712,50.5458",
    "مهزة": "26.16944,50.62611",
    "جرداب": "26.1685,50.5721",
    "جسرة": "26.1638,50.4520",
    "مركوبان": "26.1637,50.6166",
    "الخارجية": "26.16361,50.60472",
    "واديان": "26.15917,50.61111",
    "بو العيش": "26.15875,50.62157",
    "بوالعيش": "26.15875,50.62157",
    "سترة": "26.1534,50.6183",
    "سند": "26.1501,50.5837",
    "كورة": "26.1458,50.4978",
    "بوري": "26.1458,50.4978",
    "عكر": "26.14306,50.61028",
    "هملة": "26.1409,50.4604",
    "معامير": "26.1359,50.6113",
    "نويدرات": "26.13472,50.5975",
    "بو كوارة": "26.1305,50.5623",
    "بوكوارة": "26.1305,50.5623",
    "رفاع الشرقي": "26.12389,50.57361",
    "رفاع الغربي": "26.13278,50.52028",
    "الرفاع": "26.13,50.555",
    "دمستان": "26.1260,50.4766",
    "مدينة حمد": "26.11528,50.50694",
    "مدينةحمد": "26.11528,50.50694",
    "كرزكان": "26.1123,50.4821",
    "مالكية": "26.09806,50.48667",
    "صدد": "26.0862,50.4907",
    "عوالي": "26.0854,50.5475",
    "شهركان": "26.0754,50.4993",
    "دار كليب": "26.06861,50.50389",
    " عسكر ": "26.0610,50.6160",
    "صخير": "26.0566,50.5350",
    "زلاق": "26.0475,50.48639",
    "القرية": "26.1979,50.4658",
    " جو ": "25.99861,50.61667"
}