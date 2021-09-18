import React, { useState, useCallback, useEffect } from "react";
import {
  Image,
  Badge,
  Modal,
  Button,
  ButtonToolbar,
  DropdownButton,
  MenuItem,
  ListGroup,
  ListGroupItem,
  FormControl,
  Glyphicon,
  Panel,
  Well
} from "react-bootstrap";
import FontAwesome from "react-fontawesome";
import relativeDate from "relative-date";

import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../node_modules/bootstrap/dist/css/bootstrap-theme.min.css";
import "../node_modules/font-awesome/css/font-awesome.min.css";

const GOMI_ENDPOINT_URL = "https://gomi.camelon.info/api";

function gomiUserDataApi() {
  const token = window.localStorage.getItem("token");

  if (!token) {
    return Promise.reject("ログインしてください。(local)");
  }

  return window
    .fetch(GOMI_ENDPOINT_URL + "/auth/me", {
      headers: new window.Headers({ Authorization: "Bearer " + token })
    })
    .then(data => data.json())
    .then(data => {
      if (data.error) {
        return Promise.reject(`ログインしてください。(auth:${data.error})`);
      }

      return data;
    });
}

function gomiDataApi(param) {
  const token = window.localStorage.getItem("token");

  if (!token) {
    alert("ログインしてください。");
    return;
  }

  return window
    .fetch(GOMI_ENDPOINT_URL + "/endpoint", {
      method: "POST",
      body: JSON.stringify(param),
      headers: new window.Headers({ Authorization: "Bearer " + token })
    })
    .then(data => data.json())
    .then(data => {
      if (data.error === "EXPIRED") {
        console.log("Error on access to API:", data);
        alert("セッションが切れました。再度ログインしてください。");
        return;
      }

      if (data.error) {
        console.log("API_ERROR", data);
        alert(
          `リクエストでエラーが発生しました。再読み込みして解決しない場合はあきらめてください。(gomi:${data.error})`
        );
      } else {
        return data;
      }
    })
    .catch(err => {
      console.log("SERVER_ERROR", err);
      alert(
        `サーバでエラーが発生しました。再読み込みして解決しない場合はあきらめてください。(gomi:${err.message})`
      );
    });
}

const Label = {
  global_hist: "みんなが使ったゴミ",
  global_rank: "みんながよく使うゴミ",
  my_hist: "自分が使ったゴミ",
  my_rank: "自分がよく使うゴミ"
};

function App() {
  // variables
  const [me, setMe] = useState();
  const [tweets, setTweets] = useState([]);
  const [next, setNext] = useState();
  const [count, setCount] = useState();
  const [selectedSearch, setSelectedSearch] = useState("global_hist");
  const [showModal, setShowModal] = useState();
  const [input, setInput] = useState("");

  function searchGomi(type, next) {
    let param;
    if (type === "global_hist") param = { command: "list" };
    if (type === "my_hist") param = { command: "list", me: 1 };
    if (type === "global_rank") param = { command: "rank" };
    if (type === "my_rank") param = { command: "rank", me: 1 };

    console.log(type);
    param.next = next;

    console.log("SEARCH_PARAM", param);

    return gomiDataApi(param).then(data => {
      if (!data) return;

      if (type === selectedSearch && next) {
        tweets.push(...data.tweets);
        setTweets(tweets);
        console.log("APPEND_TWEET", tweets.length);
      } else {
        setTweets(data.tweets);
        console.log("PUT_TWEET", data.tweets.length);
      }

      setSelectedSearch(type);
      setNext(data.next);
      setCount(data.count);
    });
  }

  // functions
  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const inputUpdate = useCallback(e => {
    setInput(e.target.value);
  }, []);

  const pulldownChange = e => {
    searchGomi(e.target.value, null).catch(err => {
      console.log(err);
    });
  };

  const reload = () => {
    searchGomi(selectedSearch, null).catch(err => {
      console.log(err);
    });
  };

  const loadNext = () => {
    searchGomi(selectedSearch, next).catch(err => {
      console.log(err);
    });
  };

  const login = () => {
    let getJwtToken;
    getJwtToken = event => {
      window.removeEventListener("message", getJwtToken, false);
      window.localStorage.setItem("token", event.data);

      gomiUserDataApi()
        .then(data => {
          setMe(data);
          return searchGomi(selectedSearch, null);
        })
        .catch(err => {
          setMe("");
          alert(err);
        });
    };

    window.open(GOMI_ENDPOINT_URL + "/auth/start");
    window.addEventListener("message", getJwtToken, false);
  };

  const logout = useCallback(() => {
    if (window.confirm("ログアウトしますか？")) {
      window.localStorage.clear();
      setMe("");
    } else {
      alert("じゃあクリックするなよ（ﾌﾟﾝｽｺ");
    }
  }, []);

  const tweet = tweet => {
    if (window.confirm(tweet.tweet)) {
      gomiDataApi({ command: "tweet", tweet: tweet.tweet }).then(data => {
        alert("OK");
        closeModal();
      });
    } else {
      alert("じゃあクリックするなよ（ﾌﾟﾝｽｺ");
    }
  };

  useEffect(() => {
    if (!window.localStorage) {
      throw new Error("LOCAL_STORAGE_NOT_EXIST");
    }

    gomiUserDataApi()
      .then(data => {
        setMe(data);
        return searchGomi(selectedSearch, null);
      })
      .catch(err => {
        setMe("");
        console.log(err);
      });
  }, []);

  if (me === undefined) {
    return (
      <div className="text-center">
        <h1>
          <FontAwesome name="spinner" spin pulse={true} /> Loading...
        </h1>
      </div>
    );
  }

  if (me === "") {
    return (
      <div className="container-fiuld text-center">
        <h2>Gomitter</h2>
        <h2>└(┐┘)┌ </h2>
        <br />
        <div className="text-muted">Make your timeline garble.</div>
        <br />
        <Button bsStyle="primary" onClick={login}>
          <FontAwesome name="twitter" /> Login via Twitter
        </Button>
      </div>
    );
  }

  return (
    <div className="container">
      <br />
      <Well bsSize="small" className="clearfix">
        <span onClick={() => alert("バーーーカwwwwwwwwwwwwwwwwwwww")}>
          <Glyphicon glyph="trash" />
          Gomitter
          <Glyphicon glyph="trash" />
        </span>
        <div className="pull-right">
          {
            <ButtonToolbar>
              <DropdownButton
                pullRight
                bsStyle="primary"
                bsSize="xsmall"
                id="dropdown-size-extra-small"
                title={
                  <>
                    <FontAwesome name="twitter" /> {me.screen_name}
                  </>
                }
              >
                <MenuItem eventKey="0" onClick={() => alert("はずれ")}>
                  {me.display_name + " "}
                  <Image
                    circle
                    src={me.profile_image_url}
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "1px solid gray"
                    }}
                  />
                </MenuItem>
                <MenuItem divider />
                <MenuItem eventKey="1" onClick={openModal}>
                  <Glyphicon glyph="plus" /> 新規のゴミ
                </MenuItem>
                <MenuItem divider />
                <MenuItem eventKey="2" onClick={logout}>
                  <Glyphicon glyph="log-out" /> ログアウト
                </MenuItem>
              </DropdownButton>
            </ButtonToolbar>
          }
        </div>
      </Well>
      <Panel bsStyle="info">
        <Panel.Heading>
          <Glyphicon glyph="search" /> 検索するゴミの条件
        </Panel.Heading>
        <Panel.Body>
          <FormControl
            componentClass="select"
            placeholder="select"
            onChange={pulldownChange}
          >
            <option value="global_hist"> みんなが使ったゴミ </option>
            <option value="global_rank"> みんながよく使うゴミ </option>
            <option value="my_hist"> 自分が使ったゴミ </option>
            <option value="my_rank"> 自分がよく使うゴミ </option>
          </FormControl>
        </Panel.Body>
      </Panel>
      <Panel bsStyle="default">
        <Panel.Heading>
          <Glyphicon glyph="trash" />
          {' '}
          {selectedSearch ? Label[selectedSearch] : "読み込み中..."}
          {' '}
          {count ? <Badge> {count} </Badge> : ""}
          <div className="pull-right" onClick={reload}>
            <Glyphicon glyph="refresh" />
          </div>
        </Panel.Heading>
        <ListGroup>
          {tweets.map(t => {
            return (
              <ListGroupItem
                key={t.id}
                style={{
                  whiteSpace:
                    t.tweet.split("\n").length === 1 ? "preWrap" : "pre"
                }}
                onClick={() => tweet(t)}
              >
                {t.count && <Badge> {t.count} </Badge>} {t.tweet}
                <div className="text-muted">
                  {t.member_id && (
                    <span>
                      <Glyphicon glyph="user" /> {t.member_id} &nbsp; &nbsp;
                    </span>
                  )}
                  {t.created_at && (
                    <span>
                      <Glyphicon glyph="time" />
                      {' '}
                      {new Date(t.created_at * 1000).toLocaleString()}
                      ({relativeDate(t.created_at * 1000)})
                    </span>
                  )}
                </div>
              </ListGroupItem>
            );
          })}
          {next && (
            <ListGroupItem className="text-center text-muted">
              <span onClick={loadNext}>
                <Glyphicon glyph="triangle-right" />
                <Glyphicon glyph="triangle-right" />
                Load Next <Glyphicon glyph="triangle-right" />
                <Glyphicon glyph="triangle-right" />
              </span>
            </ListGroupItem>
          )}
          {!next && (
            <ListGroupItem className="text-center text-muted">
              <span
                onClick={() => alert("最後だって言ってるだろ！！！！（ﾌﾞﾁｷﾞﾚ")}
              >
                <Glyphicon glyph="trash" /> 最後だよ <Glyphicon glyph="trash" />
              </span>
            </ListGroupItem>
          )}
        </ListGroup>
      </Panel>
      <Modal show={showModal} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Glyphicon glyph="plus" /> 新規にゴミをつくる({input.length}
            /140)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormControl
            componentClass="textarea"
            placeholder="(ゴミを入力)"
            rows={10}
            onChange={inputUpdate}
            value={input}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={closeModal}>
            <Glyphicon glyph="remove" /> 閉じる
          </Button>
          <Button bsStyle="primary" onClick={() => tweet({ tweet: input })}>
            <FontAwesome name="twitter" /> Tweet
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
