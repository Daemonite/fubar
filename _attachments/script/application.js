// Apache 2.0 J Chris Anderson 2011
$(function() {
    
	util.url.logtype = util.url.logtype || "error";
	
    document.title = util.url.app + " - Fubar";
    $("#title").html(util.url.app);
    
    function drawItems() {
        var logtypes = util.deferredView("log-types").pipe(function(data){
            return data.rows[0].value.sort().map(function(val){ return { name:val, active:(val==util.url.logtype) }; });
        });
        logtypes.fail(util.renderError);
        
        var prevkey = (util.url.prevkey ? JSON.parse(util.url.prevkey) : "");
        var thiskey = "";
        var nextkey = "";
        
        util.url.rows = (util.url.rows ? parseInt(util.url.rows) : 50);
        util.url.page = (util.url.page ? parseInt(util.url.page) : 1);
        
        var params = { 
            // start key
            endkey : [ util.url.app, util.url.logtype ],
            descending:true, 
            limit:util.url.rows + 1, 
            update_seq:true 
        }
        if (util.url.startkey){
            thiskey = JSON.parse(util.url.startkey);
            params.startkey = thiskey.key;
            params.startkey_docid = thiskey.id;
            thiskey = util.url.startkey;
        }
        else {
            params.startkey = [ util.url.app, util.url.logtype, new Date() ];
        }
        
        var logs = util.deferredView("logs-bytype",params).pipe(function(data){
			util.onChanges(drawItems);
            util.setupChanges(data.update_seq,{ filter:"bylogtype", logtypes:util.url.logtype+",abc", app:util.url.app });
            
            return $.when({
                // serialize the key for this page
                thiskey : (data.rows.length ? "&startkey="+encodeURIComponent(JSON.stringify({ id:data.rows[0].id, key:data.rows[0].key }))+"&page="+util.url.page.toString() : ""),
            
                // serialize the key for the next page
                nextkey : (data.rows.length == util.url.rows + 1 ? "&startkey="+encodeURIComponent(JSON.stringify({ id:data.rows[50].id, key:data.rows[50].key }))+"&page="+(util.url.page+1).toString() : ""),
                
                logs : data.rows.map(function(val,index){ 
                    if (util.url.logid && util.url.logid == val.value._id) val.value.active = true; 
                    val.value["type-"+val.value.logtype] = true;
                    if (val.value.event) val.value["event-"+val.value.event] = true;
                    val.value["logseq"] = (util.url.page - 1) * util.url.rows + index + 1;
                    return val.value; 
                })
            })
        });
        
        var page = $.when(logtypes,logs);
        page.done(function(logtypes,logpage){
			
			var templates = [ "logs", "fragment/pagination", "fragment/log-teaser", "log-teaser/default" ];
			
			for (var i = 0; i < logpage.logs.length; i++) templates.push("log-teaser/"+logpage.logs[0].logtype);
			
            $("#content").renderTemplate(templates, { 
                logs : logpage.logs.slice(0,50), 
                includelogtype : false,
                logtypes : logtypes, 
                application : {
                    name : util.url.app
                },
                paginate : 1,
				applicationsummarypage : util.rootpath+"errors.html?app="+util.url.app,
                nextpage : (logpage.nextkey.length ? util.rootpath+"application.html?app="+util.url.app+"&logtype="+util.url.logtype+logpage.nextkey : ""),
                logtypeurl : function(){
                    return function(logtype){
                        return util.rootpath+"application.html?app="+util.url.app+"&logtype="+logtype;
                    };
                },
                logurl : function(){
                    return function(logid){
                        return util.rootpath+"log.html?id="+logid;
                    };
                }
            },function(){
                this.find(".time a").prettyDate();
            });
            
        });
        page.fail(util.renderError);
        
    };
	
	util.onSessionReady(drawItems);
    
    $(".log-table tbody tr").live("click",function(){
        window.location = $(this).find("a").attr("href");
    });
    
 });