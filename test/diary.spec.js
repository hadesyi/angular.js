import {Diary} from '../src/diary.js';


describe('Diary', () => {

  describe('root logger', () => {

    class TestReporter {

      handleEvent(level, componentId, message) {
        TestReporter.logs.push({
          level: level,
          component: componentId,
          message: message
        });
      }
    }
    TestReporter.logs = [];


    Diary.registerReporter('test', TestReporter);

    Diary.config({
      test: {info: '*'}
    });



    it("should send a message to a reporter", () => {
      Diary.log('info', 'myComponent', 'test message');
      expect(TestReporter.logs).toEqual([{
        component: 'myComponent',
        level: 'info',
        message: 'test message'
      }]);
    });

  });


  xdescribe('component logger', function() {

    it("should send a message from a component", () => {
      var myLogger = Diary.logger('my');

      myLogger.info('my test message');
    });

  });


});
