function main() {
    function participants_object() {
        this.total_count = 0;
        this.users = [];

        this.add = function (id, name) {
            this.users.push({
                "id": id,
                "name": name,
                "photo": "",
                "profile_link": "",
                "is_showed": false
            })
        };

        this.replace = function (new_object) {
            this.users.forEach(function (index, item, array) {
                if (item.id == new_object.id) {
                    item = new_object;
                    return;
                }
            });
        };

        this.get_by_id = function (id) {
            this.users.forEach(function (index, item, array) {
                if (item.id == id)
                    return item;
            });
            return undefined;
        };

        this.increment_total_count = function () {
            ++this.total_count;
        }

        this.merge = function (new_object) {
            this.users.forEach(function (index, item, array) {
                if (new_object.get_by_id(item.id))
                    new_object.replace(item)
            })
            this.users = new_object.users;
            this.total_count = new_object.total_count;
        }

        this.get_random_users = function (count_of_users) {

            function getRandomInt(min, max) {
                return Math.floor(Math.random() * (max - min)) + min;
            }

            var answer = [];
            var iterations = 0;

            if (this.users.length <= count_of_users)
                answer = this.users;
            else
                while ((answer.length != count_of_users) && (iterations < this.users.length * 3)) {
                    var a = getRandomInt(0, this.users.length);
                    if (answer.indexOf(this.users[a]) == -1) {
                        answer.push(this.users[a]);
                    }

                    ++iterations;
                }

            return answer;
        }
    };

    function get_user_td_content(link_to_user, link_to_profile_photo) {
        this.template = '<a href="{0}"><img class="img-responsive" src="{1}" alt="" style="width: 110px; padding: 10px;"/></a>';
        return this.template.replace("{0}", "https://portal.cinimex.ru/users/Person.aspx?AccountName=" + link_to_user).replace("{1}", link_to_profile_photo);
    }

    function get_users_from_list(list_title, site_url) {
        var defer = $.Deferred();

        if (!list_title)
            reject("get_users_from_list get an empty parametr 'list_title'!");

        var clientContext = (site_url) ? new SP.ClientContext(siteUrl) : new SP.ClientContext.get_current();
        var oList = clientContext.get_web().get_lists().getByTitle(list_title);
        var camlQuery = new SP.CamlQuery();
        camlQuery.set_viewXml("<View><Query><Where><Eq><FieldRef Name='IsParticipate' /><Value Type='IsParticipate'>true</Value></Eq></Where></Query></View>");
        this.collListItem = oList.getItems(camlQuery);
        clientContext.load(collListItem);

        clientContext.executeQueryAsync(function () {
            defer.resolve(collListItem.getEnumerator())
        }, function onQueryFailed(sender, args) {
            defer.reject("get_users_from_list has complete query with error " + args.get_message() + '\n' + args.get_stackTrace())
        });

        return defer.promise();
    }

    function get_user(id) {
        var defer = $.Deferred();

        if (!id)
            reject("get_user get an empty parametr 'id'!");

        $.ajax({
            url: "https://portal.cinimex.ru/_api/Web/SiteUserInfoList/Items(" + id + ")",
            method: "GET",
            headers: { "Accept": "application/json; odata=verbose" },
            success: function (data) {
                defer.resolve(data.d)
            },
            error: function (data) {
                defer.reject(JSON.stringify(data));
            }
        });

        return defer.promise();
    }

    function fill_table(array) {
        $(".user-tile").each(function (index, value) {
            $(value).removeClass('fadeIn');
            $(value).addClass('fadeOut');
            $(value).one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
                $(value).empty();
                $(value).removeClass('fadeOut');
                $(value).addClass('fadeIn');
                $(value).append(array[index]);
                
            });

        })
    }

    var participants = new participants_object();

    get_users_from_list("SummerParty2016Registration").done(function (items) {
        while (items.moveNext()) {
            var current_user = items.get_current();
            if (current_user.get_item("Employee")) {
                participants.add(current_user.get_item("Employee").get_lookupId(), current_user.get_item("Employee").get_lookupValue());

                if (current_user.get_item('ParticipateInQuest') == true)
                    participants.increment_total_count();
            }
        }
        $("#IsParticipate").empty();
        $("#IsParticipate").append("Участвуют в мероприятии: " + participants.users.length);

        $("#ParticipateInQuest").empty();
        $("#ParticipateInQuest").append("У​частвуют в квесте: " + participants.total_count);

        var users_for_table = participants.get_random_users(9);
        var templates = [];
        function get_information(array, index, callback) {
            if (index < array.length) {
                get_user(array[index].id).done(function (data) {
                    array[index].photo = data.Picture.Url;
                    array[index].profile_link = data.Name.replace("i:0#.w|", "");
                    templates.push(get_user_td_content(array[index].profile_link, array[index].photo));
                    get_information(array, index + 1, callback)
                })
            }
            else {
                callback();
            }
        }

        get_information(users_for_table, 0, function () {
            while (templates.length <= 9) {
                templates.push("<br>");
            }

            fill_table(templates);
        });
    });

    var run = setInterval(function () {

        var particips = new participants_object();

        get_users_from_list("SummerParty2016Registration").done(function (items) {
            while (items.moveNext()) {
                var current_user = items.get_current();
                if (current_user.get_item("Employee")) {

                    particips.add(current_user.get_item("Employee").get_lookupId(), current_user.get_item("Employee").get_lookupValue());
                    if (current_user.get_item('ParticipateInQuest') == true)
                        particips.increment_total_count();
                }
            }
            participants.merge(particips);

            $("#IsParticipate").empty();
            $("#IsParticipate").append("Участвуют в мероприятии: " + participants.users.length);

            $("#ParticipateInQuest").empty();
            $("#ParticipateInQuest").append("У​частвуют в квесте: " + participants.total_count);

            var users_for_table = participants.get_random_users(9);
            var templates = [];
            function get_information(array, index, callback) {
                if (index < array.length) {
                    get_user(array[index].id).done(function (data) {
                        array[index].photo = data.Picture.Url;
                        array[index].profile_link = data.Name.replace("i:0#.w|", "");
                        templates.push(get_user_td_content(array[index].profile_link, array[index].photo));
                        get_information(array, index + 1, callback)
                    })
                }
                else {
                    callback();
                }
            }

            get_information(users_for_table, 0, function () {
                while (templates.length <= 9) {
                    templates.push("<br>");
                }

                fill_table(templates);
            });
        });
    }, 7000);
}

SP.SOD.executeOrDelayUntilScriptLoaded(main, 'SP.js');