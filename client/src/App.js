import React from 'react';
import { ListGroup, ListGroupItem, FormControl, Glyphicon, Panel, Well } from 'react-bootstrap';

class App extends React.Component {
  constructor() {
    super();
    this.state = { tweets: [] };
    this.ENDPOINT_URL = "https://ckg7x7v3a3.execute-api.ap-northeast-1.amazonaws.com/dev/";
  }

  componentDidMount() {
    //fetch(this.ENDPOINT_URL)
    window.fetch(window.location.origin + '/test.json', { credentials: 'include' })
      .then(data => data.json())
      .then(data => {
        this.setState({ tweets: data.tweets });
      })
      .catch(err => {
        console.log(err);
      });
  }

  onChange(e){
    alert(e.target.value);
  }

  search(){

  }

  tweet(tweet) {
    window.confirm(tweet.tweet);
  }

  render() {
    const { tweets } = this.state;

    return <div className="container">
      <br/>
      <Well bsSize="small">
        Gomitter
      </Well>

      <Panel bsStyle="info">
        <Panel.Heading><Glyphicon glyph="search"/> 検索するゴミの条件</Panel.Heading>
        <Panel.Body>
          <FormControl componentClass="select" placeholder="select" onChange={this.onChange.bind(this)}>
            <option value="select1">select</option>
            <option value="select2">select</option>
          </FormControl>
        </Panel.Body>
      </Panel>

      <Panel bsStyle="default">
        <Panel.Heading><Glyphicon glyph="trash"/> みんなが使ったゴミ</Panel.Heading>
        <ListGroup>
          {
            tweets.map(t =>
              <ListGroupItem key={t.id} style={{ whiteSpace: "pre" }} onClick={this.tweet.bind(this,t)}>
                {t.tweet}
                <div className="text-muted">{t.member_id} {new Date(t.created_at * 1000).toISOString()}</div>
              </ListGroupItem>
            )
          }
        </ListGroup>
      </Panel>
    </div>;
  }
}

export default App;